import { NextRequest, NextResponse } from 'next/server';
import {
  TelegramUpdate,
  sendMessage,
  answerCallbackQuery,
  getFile,
  updateSession,
  getSession,
  resetSession
} from '@/lib/telegram';
import { prisma } from '@/lib/prisma';
import { extractInvoiceData } from '@/lib/gemini';
import { calcFinancialMetrics } from '@/lib/financial-metrics';
import { buildBalanceSheet, buildIncomeStatement, buildCashFlow } from '@/lib/financial-statements';

// ─── Helper Types ───

interface ParsedExpense {
  amount: number;
  description: string;
}

// ─── Helper Functions ───

function parseExpenseText(text: string): ParsedExpense | null {
  // Normalize: lowercase, strip diacritics
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const patterns: { regex: RegExp; amountGroup: number; descGroup: number }[] = [
    // "gaste 35 en gasolina" / "gaste 35usd en comida" / "pague 100.50 de luz"
    {
      regex: /(?:gaste|pague|compre|gasto|pago|page)\s+\$?([\d,.]+)\s*(?:usd|dolares|dollars|lempiras|hnl)?\s+(?:en|de|por)\s+(.+)/,
      amountGroup: 1,
      descGroup: 2,
    },
    // "compre almuerzo por 12.50"
    {
      regex: /(?:gaste|pague|compre|gasto|pago|page)\s+(.+?)\s+(?:por|de|en)\s+\$?([\d,.]+)\s*(?:usd|dolares)?$/,
      amountGroup: 2,
      descGroup: 1,
    },
    // "almuerzo por 12.50" / "luz costo 100"
    {
      regex: /^([a-záéíóúñü\s]+?)\s+(?:por|costo|cuesta|de)\s+\$?([\d,.]+)\s*(?:usd|dolares)?$/,
      amountGroup: 2,
      descGroup: 1,
    },
    // "35 en gasolina" / "$35 en gasolina"
    {
      regex: /^\$?([\d,.]+)\s*(?:usd|dolares)?\s+(?:en|de|por)\s+(.+)/,
      amountGroup: 1,
      descGroup: 2,
    },
    // "gasolina 35" / "uber 8.50" (simplest, last resort)
    {
      regex: /^([a-záéíóúñü\s]{2,}?)\s+\$?([\d,.]+)\s*(?:usd|dolares)?$/,
      amountGroup: 2,
      descGroup: 1,
    },
  ];

  for (const { regex, amountGroup, descGroup } of patterns) {
    const match = normalized.match(regex);
    if (match) {
      const rawAmount = match[amountGroup].replace(/,/g, '.');
      const amount = parseFloat(rawAmount);
      const description = match[descGroup].trim();

      if (amount > 0 && description.length > 1) {
        return {
          amount,
          description: description.charAt(0).toUpperCase() + description.slice(1),
        };
      }
    }
  }

  return null;
}

async function resolveUserCompanies(userId: string) {
  return prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
  });
}

/**
 * Handles company selection for expense flows.
 * - Single company: auto-selects and returns the companyId.
 * - Multiple companies: shows inline buttons and returns null (waits for callback).
 */
async function handleCompanySelection(
  chatId: number,
  telegramId: string,
  memberships: Array<{ company: { id: string; name: string } }>,
  nextStep: string,
  pendingData: Record<string, any>
): Promise<string | null> {
  if (memberships.length === 0) {
    await sendMessage(chatId, 'No tienes empresas asociadas. Crea una en la web primero.');
    return null;
  }

  if (memberships.length === 1) {
    // Fast track: auto-select
    await updateSession(telegramId, nextStep, {
      ...pendingData,
      companyId: memberships[0].company.id,
    });
    return memberships[0].company.id;
  }

  // Multi-company: show selection buttons
  await updateSession(telegramId, 'SELECT_COMPANY', {
    ...pendingData,
    afterCompanyStep: nextStep,
  });
  const buttons = memberships.map(m => ([{
    text: m.company.name,
    callback_data: `sel_comp:${m.company.id}`,
  }]));
  await sendMessage(chatId, '🏢 Selecciona la empresa para registrar el gasto:', {
    inline_keyboard: buttons,
  });
  return null;
}

async function handleManualDate(chatId: number, telegramId: string, text: string) {
  const lower = text.toLowerCase().trim();
  let date: Date;

  if (lower === 'hoy') {
    date = new Date();
  } else {
    const match = lower.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) {
      await sendMessage(chatId, '❌ Formato inválido. Usa DD-MM-YYYY o escribe <b>hoy</b>:');
      return;
    }
    date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
    if (isNaN(date.getTime())) {
      await sendMessage(chatId, '❌ Fecha inválida. Intenta de nuevo (DD-MM-YYYY):');
      return;
    }
  }

  await updateSession(telegramId, 'MANUAL_PROVIDER', { date: date.toISOString() });
  await sendMessage(chatId, '¿Cuál es el nombre del proveedor?');
}

async function showConfirmation(
  chatId: number,
  pendingTx: { total?: number; amount?: number; description?: string; provider?: string; date?: string },
  companyName: string
) {
  const amount = pendingTx.total ?? pendingTx.amount ?? 0;
  const desc = pendingTx.description || 'Sin descripción';
  const provider = pendingTx.provider;
  const date = pendingTx.date || 'Hoy';

  let msg = `📝 <b>Confirmar gasto:</b>\n\n`;
  msg += `🏢 Empresa: <b>${companyName}</b>\n`;
  msg += `💰 Monto: <b>$${amount.toLocaleString()}</b>\n`;
  if (provider && provider !== desc) {
    msg += `🏪 Proveedor: ${provider}\n`;
  }
  msg += `📝 Descripción: ${desc}\n`;
  msg += `📅 Fecha: ${date}\n\n`;
  msg += `¿Deseas registrar este gasto?`;

  await sendMessage(chatId, msg, {
    inline_keyboard: [[
      { text: '✅ Confirmar', callback_data: 'tx_confirm' },
      { text: '❌ Cancelar', callback_data: 'tx_cancel' },
    ]],
  });
}

// ─── Main Webhook Handler ───

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    const { message, callback_query } = update;

    if (callback_query) {
      await handleCallback(callback_query);
    } else if (message) {
      await handleMessage(message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// ─── Message Handler ───

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = message.text?.trim();
  const lowerText = text?.toLowerCase() || '';
  const photo = message.photo;

  // 1. Check if user is linked
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { companies: true },
  });

  // 2. Greeting detection
  const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'hello', 'hi'];
  const isGreeting = greetings.some(g => lowerText.includes(g));

  if (isGreeting && !user) {
    await resetSession(telegramId);
    await updateSession(telegramId, 'AWAITING_EMAIL');
    await sendMessage(chatId, `¡Hola! 👋 Soy tu asistente de <b>Conta Pro</b>.\n\nVeo que aún no hemos vinculado tu cuenta de Telegram. Para empezar, por favor indícame tu <b>correo electrónico</b> registrado en la plataforma.`);
    return;
  }

  // 3. Command routes (always active)
  if (text?.startsWith('/start')) {
    if (user) {
      await sendMessage(chatId, `¡Bienvenido de nuevo! ¿En qué puedo ayudarte hoy?\n\n- Envía una <b>foto</b> de un gasto.\n- Escribe un gasto (ej: <i>"gaste 35 en gasolina"</i>)\n- Usa /resumen para ver métricas.\n- Usa /gasto para registro paso a paso.\n- Escribe /ayuda para más comandos.`);
    } else {
      await resetSession(telegramId);
      await updateSession(telegramId, 'AWAITING_EMAIL');
      await sendMessage(chatId, '¡Hola! Para empezar a usar el bot, por favor indícame tu <b>correo electrónico</b> registrado en Conta Pro.');
    }
    return;
  }

  // 4. Handle Unlinked User States
  if (!user) {
    const session = await getSession(telegramId);
    const step = session?.step || 'START';

    // Step: AWAITING_EMAIL
    if (step === 'AWAITING_EMAIL' || lowerText.includes('@')) {
      const email = lowerText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g)?.[0];

      if (!email) {
        await sendMessage(chatId, '❌ No parece un correo válido. Por favor, asegúrate de escribirlo correctamente.');
        return;
      }

      const targetUser = await prisma.user.findUnique({ where: { email } });

      if (!targetUser) {
        await sendMessage(chatId, '🔍 No encuentro ninguna cuenta con ese correo. Por favor, verifica tu correo en el Dashboard de Conta Pro.');
        return;
      }

      await updateSession(telegramId, 'AWAITING_LINK_CODE', { pendingUserId: targetUser.id, email });
      await sendMessage(chatId, `¡Te encontré, ${targetUser.email.split('@')[0]}! 🎉\n\nPor seguridad, ahora ingresa el <b>código de 6 dígitos</b> que aparece en tu Dashboard web (Sección CUMPLIMIENTO > Bot de Telegram).`);
      return;
    }

    // Step: AWAITING_LINK_CODE
    if (step === 'AWAITING_LINK_CODE' || (text?.length === 6 && !isNaN(Number(text)))) {
      const code = text?.replace(/\s/g, '');
      const userId = (session?.data as any)?.pendingUserId;

      if (!userId) {
        await resetSession(telegramId);
        await updateSession(telegramId, 'AWAITING_EMAIL');
        await sendMessage(chatId, 'Ocurrió un error en el proceso. Por favor, ingresa tu correo de nuevo.');
        return;
      }

      const pendingUser = await prisma.user.findUnique({ where: { id: userId } });
      const metadata = pendingUser?.metadata as any;

      if (metadata?.telegramLinkToken === code) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            telegramId,
            metadata: { ...metadata, telegramLinkToken: null },
          },
        });
        await resetSession(telegramId);
        await sendMessage(chatId, '✅ ¡Configuración completada! Ahora puedo ayudarte a registrar gastos y consultar tus métricas.\n\nPrueba enviándome una foto de un ticket o escribe un gasto como <i>"gaste 35 en gasolina"</i>.');
      } else {
        await sendMessage(chatId, '❌ El código es incorrecto o ha expirado. Por favor, genera uno nuevo en el Dashboard web e inténtalo de nuevo.');
      }
      return;
    }

    // Default for unlinked
    if (!isGreeting) {
      await sendMessage(chatId, '⚠️ Tu cuenta no está vinculada. Por favor, dime tu <b>correo electrónico</b> para iniciar el proceso.');
    }
    return;
  }

  // ═══════════════════════════════════════════
  // 5. Linked User — Commands
  // ═══════════════════════════════════════════

  if (text?.startsWith('/resumen')) {
    const session = await getSession(telegramId);
    let companyId = (session?.data as any)?.companyId;

    if (!companyId && user.companies.length > 0) {
      companyId = user.companies[0].id;
    }

    if (!companyId) {
      await sendMessage(chatId, 'No tienes empresas asociadas. Por favor, crea una en la web primero.');
      return;
    }

    await sendMessage(chatId, '⏳ Calculando métricas en tiempo real...');
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = now;
    const [bs, is, cf] = await Promise.all([
      buildBalanceSheet(companyId, endDate),
      buildIncomeStatement(companyId, startDate, endDate),
      buildCashFlow(companyId, startDate, endDate),
    ]);
    const metrics = await calcFinancialMetrics(bs, is, cf, companyId);
    const summary = `
📊 <b>Resumen Financiero</b>
🏢 Empresa: ${user.companies.find((c: any) => c.id === companyId)?.name || 'Principal'}

🟢 <b>EBITDA:</b> $${metrics.ebitda.toLocaleString()}
🔵 <b>Utilidad Neta:</b> $${metrics.netIncome.toLocaleString()}
📈 <b>Margen Neto:</b> ${(metrics.netMargin * 100).toFixed(1)}%

<i>Tip: Envíame una foto de un ticket para registrar un gasto al instante.</i>
    `;
    await sendMessage(chatId, summary);
    return;
  }

  if (text?.startsWith('/ayuda')) {
    const helpMsg = `
<b>Comandos disponibles:</b>

/resumen — Ver métricas financieras
/gasto — Registrar un gasto paso a paso
/ayuda — Ver esta ayuda
/cancelar — Cancelar operación en curso

<b>También puedes:</b>
- Enviar una <b>foto</b> de factura o ticket para registro automático con IA
- Escribir un gasto directamente, por ejemplo:
  <i>"gaste 35 en gasolina"</i>
  <i>"pague 100 de luz"</i>
  <i>"almuerzo 12.50"</i>
    `;
    await sendMessage(chatId, helpMsg);
    return;
  }

  if (text?.startsWith('/cancelar')) {
    await resetSession(telegramId);
    await sendMessage(chatId, '✅ Operación cancelada. Puedes empezar de nuevo.');
    return;
  }

  if (text?.startsWith('/gasto')) {
    await resetSession(telegramId);
    const memberships = await resolveUserCompanies(user.id);
    if (memberships.length === 0) {
      await sendMessage(chatId, 'No tienes empresas asociadas. Crea una en la web primero.');
      return;
    }
    const resolved = await handleCompanySelection(
      chatId, telegramId, memberships, 'MANUAL_DATE', {}
    );
    if (resolved) {
      const companyName = memberships[0].company.name;
      await sendMessage(chatId, `🏢 Empresa: <b>${companyName}</b>\n\nIngresa la fecha del gasto (DD-MM-YYYY) o escribe <b>hoy</b>:`);
    }
    return;
  }

  // ═══════════════════════════════════════════
  // 6. Linked User — Active Session Steps
  // ═══════════════════════════════════════════

  const session = await getSession(telegramId);
  const currentStep = session?.step;

  if (currentStep === 'MANUAL_DATE' && text) {
    await handleManualDate(chatId, telegramId, text);
    return;
  }

  if (currentStep === 'MANUAL_PROVIDER' && text) {
    await updateSession(telegramId, 'MANUAL_AMOUNT', { providerName: text });
    await sendMessage(chatId, '💰 Ingresa el monto (ej: 25.50):');
    return;
  }

  if (currentStep === 'MANUAL_AMOUNT' && text) {
    const amount = parseFloat(text.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      await sendMessage(chatId, '❌ Monto inválido. Ingresa un número (ej: 25.50):');
      return;
    }
    await updateSession(telegramId, 'MANUAL_DESCRIPTION', { amount });
    await sendMessage(chatId, '📝 Ingresa una breve descripción del gasto:');
    return;
  }

  if (currentStep === 'MANUAL_DESCRIPTION' && text) {
    const sessionData = session?.data as any;
    const companyId = sessionData?.companyId;
    const categories = await prisma.category.findMany({
      where: { companyId, type: 'EGRESO' },
    });

    if (categories.length === 0) {
      await sendMessage(chatId, '❌ No hay categorías de egreso configuradas. Configúralas en el Dashboard.');
      await resetSession(telegramId);
      return;
    }

    const buttons = categories.map((c: any) => ([{
      text: `${c.icon || '📂'} ${c.name}`,
      callback_data: `sel_cat:${c.id}`,
    }]));
    await updateSession(telegramId, 'MANUAL_CATEGORY', { description: text });
    await sendMessage(chatId, '📂 Selecciona la categoría del gasto:', { inline_keyboard: buttons });
    return;
  }

  // ═══════════════════════════════════════════
  // 7. Linked User — Text Expense Detection
  // ═══════════════════════════════════════════

  if (text && !text.startsWith('/')) {
    const parsed = parseExpenseText(text);
    if (parsed) {
      await resetSession(telegramId);
      const memberships = await resolveUserCompanies(user.id);
      if (memberships.length === 0) {
        await sendMessage(chatId, 'No tienes empresas asociadas.');
        return;
      }

      const pendingTx = {
        total: parsed.amount,
        description: parsed.description,
        provider: parsed.description,
        date: new Date().toISOString().split('T')[0],
      };

      const resolved = await handleCompanySelection(
        chatId, telegramId, memberships, 'CONFIRM_TRANSACTION',
        { pendingTx }
      );

      if (resolved) {
        // Single company — show confirmation immediately
        await showConfirmation(chatId, pendingTx, memberships[0].company.name);
      }
      // Multi-company: handleCompanySelection already showed buttons
      return;
    }
  }

  // ═══════════════════════════════════════════
  // 8. Linked User — Photo (AI Extraction)
  // ═══════════════════════════════════════════

  if (photo && photo.length > 0) {
    const fileId = photo[photo.length - 1].file_id;
    await sendMessage(chatId, '🔍 Procesando imagen con IA...');

    const imageUrl = await getFile(fileId);
    if (!imageUrl) {
      await sendMessage(chatId, '❌ Error al obtener la imagen.');
      return;
    }

    const data = await extractInvoiceData(imageUrl);
    if (!data) {
      await sendMessage(chatId, '❌ No pude extraer datos. Intenta con una foto más clara.');
      return;
    }

    await resetSession(telegramId);
    const memberships = await resolveUserCompanies(user.id);
    if (memberships.length === 0) {
      await sendMessage(chatId, 'No tienes empresas asociadas.');
      return;
    }

    const pendingTx = {
      total: data.total,
      description: data.description,
      provider: data.provider,
      date: data.date,
    };

    const resolved = await handleCompanySelection(
      chatId, telegramId, memberships, 'CONFIRM_TRANSACTION',
      { pendingTx }
    );

    if (resolved) {
      // Single company — show confirmation
      await showConfirmation(chatId, pendingTx, memberships[0].company.name);
    }
    return;
  }

  // ═══════════════════════════════════════════
  // 9. Default Responses
  // ═══════════════════════════════════════════

  if (isGreeting) {
    await sendMessage(chatId, `¡Hola de nuevo! ¿En qué puedo ayudarte hoy?\n\n- Envía una <b>foto</b> de un gasto.\n- Escribe un gasto (ej: <i>"gaste 35 en gasolina"</i>)\n- Usa /resumen para ver métricas.\n- Usa /gasto para registro paso a paso.\n- Escribe /ayuda para más comandos.`);
    return;
  }

  await sendMessage(chatId, `No reconozco ese mensaje. Puedes:\n\n- Enviar una <b>foto</b> de un ticket o factura\n- Escribir un gasto (ej: <i>"gaste 35 en gasolina"</i>)\n- Usar /gasto para registro paso a paso\n- Escribir /ayuda para ver todos los comandos`);
}

// ─── Callback Handler ───

async function handleCallback(callback: any) {
  const telegramId = String(callback.from.id);
  const chatId = callback.message.chat.id;
  const data = callback.data;

  const session = await getSession(telegramId);
  if (!session) {
    await answerCallbackQuery(callback.id, 'Sesión expirada.');
    return;
  }

  // ── Company selection callback ──
  if (data.startsWith('sel_comp:')) {
    if (session.step !== 'SELECT_COMPANY') {
      await answerCallbackQuery(callback.id, 'Sesión inválida.');
      return;
    }

    const companyId = data.split(':')[1];
    const sessionData = (session.data as any) || {};
    const afterStep = sessionData.afterCompanyStep || 'CONFIRM_TRANSACTION';

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company?.name || 'Empresa';

    await updateSession(telegramId, afterStep, { companyId });

    if (afterStep === 'CONFIRM_TRANSACTION' && sessionData.pendingTx) {
      await showConfirmation(chatId, sessionData.pendingTx, companyName);
    } else if (afterStep === 'MANUAL_DATE') {
      await sendMessage(chatId, `🏢 Empresa: <b>${companyName}</b>\n\nIngresa la fecha del gasto (DD-MM-YYYY) o escribe <b>hoy</b>:`);
    }

    await answerCallbackQuery(callback.id);
    return;
  }

  // ── Category selection callback (manual flow) ──
  if (data.startsWith('sel_cat:')) {
    if (session.step !== 'MANUAL_CATEGORY') {
      await answerCallbackQuery(callback.id, 'Sesión inválida.');
      return;
    }

    const categoryId = data.split(':')[1];
    const sessionData = (session.data as any) || {};

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || !sessionData.companyId) {
      await sendMessage(chatId, '❌ Error en la sesión. Inicia de nuevo con /gasto');
      await resetSession(telegramId);
      await answerCallbackQuery(callback.id);
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: sessionData.companyId } });

    // Create provider if name was provided
    let clientId: string | undefined;
    if (sessionData.providerName) {
      const newProvider = await prisma.accountClient.create({
        data: {
          name: sessionData.providerName,
          companyId: sessionData.companyId,
          role: 'SUPPLIER',
        },
      });
      clientId = newProvider.id;
    }

    const transaction = await prisma.transaction.create({
      data: {
        companyId: sessionData.companyId,
        userId: user.id,
        date: sessionData.date ? new Date(sessionData.date) : new Date(),
        amount: sessionData.amount || 0,
        description: `[BOT] ${sessionData.providerName || ''}: ${sessionData.description || ''}`.trim(),
        type: 'EGRESO',
        categoryId,
        clientId,
        status: 'PENDING_APPROVAL',
        metadata: { source: 'telegram_bot', manual_entry: true },
      },
      include: { category: true },
    });

    await resetSession(telegramId);

    let ticket = `✅ <b>Gasto Registrado</b>\n`;
    ticket += `────────────────\n`;
    ticket += `🏢 Empresa: ${company?.name}\n`;
    if (sessionData.providerName) ticket += `👤 Proveedor: ${sessionData.providerName}\n`;
    ticket += `📂 Categoría: ${transaction.category.name}\n`;
    ticket += `💰 Monto: $${transaction.amount.toFixed(2)}\n`;
    ticket += `📅 Fecha: ${transaction.date.toLocaleDateString()}\n`;
    ticket += `────────────────\n`;
    ticket += `Estado: <b>PENDIENTE DE APROBACIÓN</b>`;

    await sendMessage(chatId, ticket);
    await answerCallbackQuery(callback.id, 'Registrado');
    return;
  }

  // ── Transaction confirm/cancel callback ──
  if (session.step !== 'CONFIRM_TRANSACTION') {
    await answerCallbackQuery(callback.id, 'Sesión expirada.');
    return;
  }

  if (data === 'tx_confirm') {
    const txData = (session.data as any).pendingTx;
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { companies: true },
    });

    if (!user || user.companies.length === 0) {
      await sendMessage(chatId, '❌ Error: Empresa no encontrada.');
      await answerCallbackQuery(callback.id);
      return;
    }

    const companyId = (session.data as any).companyId || user.companies[0].id;

    const defaultCategory = await prisma.category.findFirst({
      where: { companyId, type: 'EGRESO', name: { contains: 'Gastos' } },
    }) || await prisma.category.findFirst({
      where: { companyId, type: 'EGRESO' },
    });

    if (!defaultCategory) {
      await sendMessage(chatId, '❌ Error: No hay categorías de egreso. Configúralas en el Dashboard.');
      await answerCallbackQuery(callback.id);
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });

    await prisma.transaction.create({
      data: {
        companyId,
        userId: user.id,
        date: txData.date ? new Date(txData.date) : new Date(),
        amount: txData.total || 0,
        description: `[BOT] ${txData.provider || ''}: ${txData.description || ''}`.trim(),
        type: 'EGRESO',
        categoryId: defaultCategory.id,
        status: 'PENDING_APPROVAL',
        metadata: { source: 'telegram_bot', ai_extracted: !!txData.provider },
      },
    });

    await resetSession(telegramId);

    let ticket = `✅ <b>Gasto Registrado</b>\n`;
    ticket += `────────────────\n`;
    ticket += `🏢 Empresa: ${company?.name}\n`;
    if (txData.provider) ticket += `🏪 Proveedor: ${txData.provider}\n`;
    ticket += `📂 Categoría: ${defaultCategory.name}\n`;
    ticket += `💰 Monto: $${(txData.total || 0).toLocaleString()}\n`;
    ticket += `📅 Fecha: ${txData.date || new Date().toLocaleDateString()}\n`;
    ticket += `────────────────\n`;
    ticket += `Estado: <b>PENDIENTE DE APROBACIÓN</b>`;

    await sendMessage(chatId, ticket);
    await answerCallbackQuery(callback.id, 'Registrado');
  } else if (data === 'tx_cancel') {
    await resetSession(telegramId);
    await sendMessage(chatId, '❌ Registro cancelado.');
    await answerCallbackQuery(callback.id, 'Cancelado');
  }
}
