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
import prisma from '@/lib/prisma';
import { extractInvoiceData } from '@/lib/gemini';
import { calcFinancialMetrics } from '@/lib/financial-metrics';

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

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = message.text?.trim();
  const lowerText = text?.toLowerCase() || '';
  const photo = message.photo;

  // 1. Check if user is linked
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { companies: true }
  });

  // 2. Greeting Detector
  const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'hello', 'hi'];
  const isGreeting = greetings.some(g => lowerText.includes(g));

  if (isGreeting && !user) {
    await updateSession(telegramId, 'AWAITING_EMAIL');
    await sendMessage(chatId, `¡Hola! 👋 Soy tu asistente de <b>Conta Pro</b>.\n\nVeo que aún no hemos vinculado tu cuenta de Telegram. Para empezar, por favor indícame tu <b>correo electrónico</b> registrado en la plataforma.`);
    return;
  }

  // 3. Command routes (always active)
  if (text?.startsWith('/start')) {
    if (user) {
      await sendMessage(chatId, '¡Bienvenido de nuevo! Ya estás vinculado. Puedes enviarme fotos de facturas o usar /resumen.');
    } else {
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
            metadata: { ...metadata, telegramLinkToken: null }
          }
        });
        await resetSession(telegramId);
        await sendMessage(chatId, '✅ ¡Configuración completada! Ahora puedo ayudarte a registrar gastos y consultar tus métricas. Prueba enviándome una foto de un ticket.');
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

  // 5. Handling Linked User Actions
  if (text?.startsWith('/resumen')) {
    const session = await getSession(telegramId);
    let companyId = (session?.data as any)?.activeCompanyId;
    
    if (!companyId && user.companies.length > 0) {
      companyId = user.companies[0].id;
    }

    if (!companyId) {
      await sendMessage(chatId, 'No tienes empresas asociadas. Por favor, crea una en la web primero.');
      return;
    }

    await sendMessage(chatId, '⏳ Calculando métricas en tiempo real...');
    const metrics = await calcFinancialMetrics(companyId);
    const summary = `
📊 <b>Resumen Financiero</b>
🏢 Empresa: ${user.companies.find(c => c.id === companyId)?.name || 'Principal'}

🟢 <b>EBITDA:</b> $${metrics.ebitda.toLocaleString()}
🔵 <b>Utilidad Neta:</b> $${metrics.netIncome.toLocaleString()}
📈 <b>Margen Neto:</b> ${(metrics.netMargin * 100).toFixed(1)}%

<i>Tip: Envíame una foto de un ticket para registrar un gasto al instante.</i>
    `;
    await sendMessage(chatId, summary);
    return;
  }

  // Manejo de Fotos (IA Gemini 2.0)
  if (photo && photo.length > 0) {
    const fileId = photo[photo.length - 1].file_id;
    await sendMessage(chatId, '🔍 Procesando imagen con Gemini 2.0 Flash Lite...');
    
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

    await updateSession(telegramId, 'CONFIRM_TRANSACTION', { 
      pendingTx: data
    });

    const confirmationMsg = `
📝 <b>Datos Extraídos:</b>
🏢 Proveedor: ${data.provider}
💰 Total: $${data.total?.toLocaleString()}
📅 Fecha: ${data.date}
📝 Detalle: ${data.description}

¿Deseas registrar este gasto en tu contabilidad?
    `;

    await sendMessage(chatId, confirmationMsg, {
      inline_keyboard: [
        [
          { text: '✅ Confirmar', callback_data: 'tx_confirm' },
          { text: '❌ Cancelar', callback_data: 'tx_cancel' }
        ]
      ]
    });
    return;
  }

  // Respuesta por defecto (Conversacional básica)
  if (isGreeting) {
      await sendMessage(chatId, `¡Hola de nuevo! ¿En qué puedo ayudarte hoy?\n\n- Envía una <b>foto</b> de un gasto.\n- Usa <b>/resumen</b> para ver métricas.\n- Escribe <b>/ayuda</b> para más comandos.`);
      return;
  }

  await sendMessage(chatId, 'Lo siento, no reconozco ese comando. Prueba enviándome una foto o usa /resumen.');
}

async function handleCallback(callback: any) {
  const telegramId = String(callback.from.id);
  const chatId = callback.message.chat.id;
  const data = callback.data;

  const session = await getSession(telegramId);
  if (!session || session.step !== 'CONFIRM_TRANSACTION') {
    await answerCallbackQuery(callback.id, 'Sesión expirada.');
    return;
  }

  if (data === 'tx_confirm') {
    const txData = (session.data as any).pendingTx;
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { companies: true }
    });

    if (!user || user.companies.length === 0) {
      await sendMessage(chatId, '❌ Error: Empresa no encontrada.');
      return;
    }

    const companyId = (session.data as any).activeCompanyId || user.companies[0].id;

    await prisma.transaction.create({
      data: {
        companyId,
        date: txData.date ? new Date(txData.date) : new Date(),
        amount: txData.total || 0,
        description: `[BOT] ${txData.provider}: ${txData.description}`,
        type: 'EGRESO',
        category: 'GAST_ADMIN',
        status: 'PENDING_APPROVAL',
        metadata: { source: 'telegram_bot', ai_extracted: true }
      }
    });

    await resetSession(telegramId);
    await sendMessage(chatId, '✅ ¡Gasto registrado! Ya puedes verlo en el Dashboard esperando aprobación.');
    await answerCallbackQuery(callback.id, 'Registrado');
  } else {
    await resetSession(telegramId);
    await sendMessage(chatId, '❌ Registro cancelado.');
    await answerCallbackQuery(callback.id, 'Cancelado');
  }
}
