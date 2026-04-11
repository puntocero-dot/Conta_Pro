import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as tg from '@/lib/telegram';
import { extractInvoiceData } from '@/lib/gemini';
import { CompanyType, Role, TransactionStatus, TransactionType } from '@prisma/client';

export async function POST(req: NextRequest) {
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update: tg.TelegramUpdate = await req.json();

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (error) {
    console.error('Error handling Telegram update:', error);
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(message: tg.TelegramMessage) {
  const chatId = message.chat.id;
  const telegramId = message.from.id.toString();
  const text = message.text;

  // 1. Check if user is authenticated
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user && text !== '/start' && !text?.includes('@')) {
    const session = await tg.getSession(telegramId);
    if (!session || session.step !== 'AWAITING_AUTH_EMAIL') {
      await tg.sendMessage(chatId, 'Hola! Soy el bot de <b>Conta Pro</b>. \n\nPara empezar, por favor envíame tu correo electrónico registrado en la plataforma.');
      await tg.updateSession(telegramId, 'AWAITING_AUTH_EMAIL');
      return;
    }
  }

  // Handle Flow
  const session = await tg.getSession(telegramId);
  const step = session?.step || 'START';

  if (text === '/start' || text === '/gasto') {
    if (!user) {
      await tg.sendMessage(chatId, 'Por favor, envíame tu correo electrónico para vincular tu cuenta.');
      await tg.updateSession(telegramId, 'AWAITING_AUTH_EMAIL');
    } else {
      await startExpenseFlow(chatId, user);
    }
    return;
  }

  switch (step) {
    case 'AWAITING_AUTH_EMAIL':
      await handleAuthEmail(chatId, telegramId, text || '');
      break;

    case 'UPLOAD_RECEIPT':
      if (message.photo) {
        await handleReceiptPhoto(chatId, telegramId, message.photo);
      } else if (text === 'Omitir ⏩') {
        await tg.updateSession(telegramId, 'ENTER_DATE');
        await tg.sendMessage(chatId, 'De acuerdo. Por favor ingresa la fecha del gasto (DD-MM-YYYY):');
      } else {
        await tg.sendMessage(chatId, 'Por favor sube una foto del recibo o presiona "Omitir ⏩"', {
          keyboard: [[{ text: 'Omitir ⏩' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      }
      break;

    case 'ENTER_DATE':
      await handleEnterDate(chatId, telegramId, text || '');
      break;

    case 'SELECT_PROVIDER_NAME':
      await handleProviderSearch(chatId, telegramId, text || '');
      break;

    case 'ENTER_AMOUNT':
      await handleEnterAmount(chatId, telegramId, text || '');
      break;

    case 'ENTER_DESCRIPTION':
      await handleEnterDescription(chatId, telegramId, text || '');
      break;

    default:
      if (text === '/cancelar') {
        await tg.resetSession(telegramId);
        await tg.sendMessage(chatId, 'Flujo cancelado.');
      }
  }
}

// --- Specific Handlers ---

async function handleAuthEmail(chatId: number, telegramId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    await prisma.user.update({
      where: { email },
      data: { telegramId },
    });
    await tg.sendMessage(chatId, `¡Bienvenido/a <b>${user.email}</b>! Tu cuenta ha sido vinculada correctamente.`);
    await startExpenseFlow(chatId, user);
  } else {
    await tg.sendMessage(chatId, 'Lo siento, no encontré ningún usuario con ese correo. Por favor verifica e intenta de nuevo.');
  }
}

async function startExpenseFlow(chatId: number, user: any) {
  const telegramId = user.telegramId;
  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    include: { company: true },
  });

  if (memberships.length === 0) {
    await tg.sendMessage(chatId, 'No tienes empresas vinculadas a tu cuenta.');
    return;
  }

  if (memberships.length === 1) {
    const company = memberships[0].company;
    await tg.updateSession(telegramId, 'UPLOAD_RECEIPT', { companyId: company.id });
    await tg.sendMessage(chatId, `Empresa: <b>${company.name}</b>\n\nPor favor sube una foto del recibo o factura para procesar los datos automáticamente.`);
  } else {
    await tg.updateSession(telegramId, 'SELECT_COMPANY');
    const buttons = memberships.map((m: any) => ([{
      text: m.company.name,
      callback_data: `sel_comp:${m.company.id}`
    }]));
    await tg.sendMessage(chatId, 'Selecciona la empresa para la cual deseas registrar el gasto:', {
      inline_keyboard: buttons
    });
  }
}

async function handleCallback(callback: tg.TelegramCallbackQuery) {
  const telegramId = callback.from.id.toString();
  const data = callback.data;
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;

  if (data.startsWith('sel_comp:')) {
    const companyId = data.split(':')[1];
    await tg.updateSession(telegramId, 'UPLOAD_RECEIPT', { companyId });
    await tg.editMessageText(chatId, messageId, 'Empresa seleccionada. Por favor sube una foto del recibo o factura para extraer los datos:');
    await tg.answerCallbackQuery(callback.id);
  }
  
  if (data.startsWith('sel_cat:')) {
    const categoryId = data.split(':')[1];
    await tg.updateSession(telegramId, 'ENTER_AMOUNT', { categoryId });
    await tg.editMessageText(chatId, messageId, 'Categoría seleccionada. Por favor ingresa el monto total (ej: 25.50):');
    await tg.answerCallbackQuery(callback.id);
  }

  if (data.startsWith('sel_prov:')) {
    const providerId = data.split(':')[1];
    await tg.updateSession(telegramId, 'SELECT_CATEGORY', { clientId: providerId });
    await tg.editMessageText(chatId, messageId, 'Proveedor seleccionado.');
    await showCategories(chatId, telegramId);
    await tg.answerCallbackQuery(callback.id);
  }

  if (data.startsWith('create_prov:')) {
    const providerName = data.split(':')[1];
    await tg.updateSession(telegramId, 'SELECT_CATEGORY', { providerName, isNewProvider: true });
    await tg.editMessageText(chatId, messageId, `Nuevo proveedor "${providerName}" será creado.`);
    await showCategories(chatId, telegramId);
    await tg.answerCallbackQuery(callback.id);
  }
}

async function handleReceiptPhoto(chatId: number, telegramId: string, photo: any[]) {
  // Get largest photo
  const bestPhoto = photo[photo.length - 1];
  const fileUrl = await tg.getFile(bestPhoto.file_id);

  if (!fileUrl) {
    await tg.sendMessage(chatId, 'No pude obtener la imagen. Por favor intenta de nuevo.');
    return;
  }

  await tg.sendMessage(chatId, 'Procesando imagen con IA... ⏳');
  
  const extracted = await extractInvoiceData(fileUrl);
  
  if (extracted) {
    await tg.updateSession(telegramId, 'SELECT_PROVIDER_NAME', { 
      extractedData: extracted,
      date: extracted.date,
      amount: extracted.total,
      description: extracted.description,
      temp_provider_name: extracted.provider
    });

    let msg = `He detectado lo siguiente:\n\n`;
    msg += `📅 Fecha: ${extracted.date || 'No detectada'}\n`;
    msg += `💰 Monto: ${extracted.total || 'No detectado'}\n`;
    msg += `🏢 Proveedor: ${extracted.provider || 'No detectado'}\n`;
    msg += `📝 Descr: ${extracted.description || 'No detectada'}\n\n`;
    msg += `¿Es correcto el nombre del proveedor? Escribe el nombre para buscar/crear o confirma.`;
    
    await tg.sendMessage(chatId, msg);
    await handleProviderSearch(chatId, telegramId, extracted.provider || '');
  } else {
    await tg.sendMessage(chatId, 'No pude extraer los datos. Por favor ingresa la fecha (DD-MM-YYYY):');
    await tg.updateSession(telegramId, 'ENTER_DATE');
  }
}

async function handleEnterDate(chatId: number, telegramId: string, text: string) {
  // Basic date validation DD-MM-YYYY
  const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  if (dateRegex.test(text)) {
    const [d, m, y] = text.split('-');
    const date = new Date(`${y}-${m}-${d}`);
    await tg.updateSession(telegramId, 'SELECT_PROVIDER_NAME', { date: date.toISOString() });
    await tg.sendMessage(chatId, 'Fecha guardada. ¿Cuál es el nombre del proveedor?');
  } else {
    await tg.sendMessage(chatId, 'Formato inválido. Por favor usa DD-MM-YYYY (ej: 15-04-2024):');
  }
}

async function handleProviderSearch(chatId: number, telegramId: string, text: string) {
  const session = await tg.getSession(telegramId);
  const companyId = (session?.data as any)?.companyId;

  if (!text) {
    await tg.sendMessage(chatId, 'Por favor escribe el nombre del proveedor para buscarlo o crearlo.');
    return;
  }

  const providers = await prisma.accountClient.findMany({
    where: {
      companyId,
      name: { contains: text, mode: 'insensitive' }
    },
    take: 5
  });

  if (providers.length > 0) {
    const buttons = providers.map((p: any) => ([{
      text: p.name,
      callback_data: `sel_prov:${p.id}`
    }]));
    buttons.push([{ text: `➕ Crear "${text}" asumiendo Factura`, callback_data: `create_prov:${text}` }]);
    
    await tg.sendMessage(chatId, `Encontré estos proveedores similares. Selecciona uno o crea uno nuevo:`, {
      inline_keyboard: buttons
    });
  } else {
    await tg.updateSession(telegramId, 'SELECT_CATEGORY', { providerName: text, isNewProvider: true });
    await showCategories(chatId, telegramId);
  }
}

async function showCategories(chatId: number, telegramId: string) {
  const session = await tg.getSession(telegramId);
  const companyId = (session?.data as any)?.companyId;

  const categories = await prisma.category.findMany({
    where: { companyId, type: 'EGRESO' }
  });

  const buttons = categories.map((c: any) => ([{
    text: `${c.icon} ${c.name}`,
    callback_data: `sel_cat:${c.id}`
  }]));

  await tg.sendMessage(chatId, 'Selecciona la categoría del gasto:', {
    inline_keyboard: buttons
  });
}

async function handleEnterAmount(chatId: number, telegramId: string, text: string) {
  const amount = parseFloat(text.replace(',', '.'));
  if (isNaN(amount)) {
    await tg.sendMessage(chatId, 'Monto inválido. Por favor ingresa un número (ej: 25.50):');
    return;
  }

  await tg.updateSession(telegramId, 'ENTER_DESCRIPTION', { amount });
  await tg.sendMessage(chatId, 'Monto guardado. Por último, ingresa una breve descripción del gasto:');
}

async function handleEnterDescription(chatId: number, telegramId: string, text: string) {
  const session = await tg.getSession(telegramId);
  const data = session?.data as any;

  if (!data.companyId || !data.categoryId || !data.amount) {
    await tg.sendMessage(chatId, 'Error en la sesión. Por favor inicia de nuevo con /start');
    return;
  }

  const user = await prisma.user.findUnique({ where: { telegramId } });
  const company = await prisma.company.findUnique({ where: { id: data.companyId } });

  if (!user || !company) return;

  // Determine Status
  let status: TransactionStatus = TransactionStatus.ACTIVE;
  if (user.role === Role.CLIENTE) {
    if (company.companyType !== CompanyType.PERSONA_NATURAL && company.companyType !== CompanyType.SAS) {
      status = TransactionStatus.PENDING_APPROVAL;
    }
  }

  // Handle Provider creation if new
  let clientId = data.clientId;
  if (!clientId && data.providerName) {
    const newProv = await prisma.accountClient.create({
      data: {
        name: data.providerName,
        companyId: data.companyId,
        role: 'SUPPLIER'
      }
    });
    clientId = newProv.id;
  }

  // Create Transaction
  const transaction = await prisma.transaction.create({
    data: {
      amount: data.amount,
      description: text,
      date: data.date ? new Date(data.date) : new Date(),
      categoryId: data.categoryId,
      companyId: data.companyId,
      userId: user.id,
      clientId: clientId,
      status: status,
      type: TransactionType.EGRESO
    },
    include: {
      category: true,
      client: true
    }
  });

  await tg.resetSession(telegramId);

  let ticket = `✅ <b>Gasto Registrado</b>\n`;
  ticket += `------------------------\n`;
  ticket += `🆔 ID: ${transaction.id.slice(0, 8)}\n`;
  ticket += `🏢 Empresa: ${company.name}\n`;
  ticket += `👤 Proveedor: ${transaction.client?.name || 'N/A'}\n`;
  ticket += `📂 Cat: ${transaction.category.name}\n`;
  ticket += `💰 Monto: $${transaction.amount.toFixed(2)}\n`;
  ticket += `📅 Fecha: ${transaction.date.toLocaleDateString()}\n`;
  ticket += `------------------------\n`;
  ticket += `Estado: <b>${status === 'ACTIVE' ? 'ACTIVO' : 'PENDIENTE DE APROBACIÓN'}</b>\n`;

  await tg.sendMessage(chatId, ticket);
}
