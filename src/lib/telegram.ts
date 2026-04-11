import { prisma } from './prisma';

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    file_size: number;
    width: number;
    height: number;
  }>;
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  message: TelegramMessage;
  data: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramRequest(method: string, body: any) {
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

export async function sendMessage(chatId: number | string, text: string, replyMarkup?: any) {
  return sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

export async function editMessageText(chatId: number | string, messageId: number, text: string, replyMarkup?: any) {
  return sendTelegramRequest('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return sendTelegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function getFile(fileId: string) {
  const fileInfo = await sendTelegramRequest('getFile', { file_id: fileId });
  if (fileInfo.ok) {
    const filePath = fileInfo.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    return fileUrl;
  }
  return null;
}

// Session Helpers
export async function getSession(telegramId: string) {
  return prisma.botSession.findUnique({
    where: { telegramId },
  });
}

export async function updateSession(telegramId: string, step: string, data: any = {}) {
  const session = await getSession(telegramId);
  const currentData = session?.data ? (session.data as any) : {};
  
  return prisma.botSession.upsert({
    where: { telegramId },
    update: {
      step,
      data: { ...currentData, ...data },
    },
    create: {
      telegramId,
      step,
      data,
    },
  });
}

export async function resetSession(telegramId: string) {
  return prisma.botSession.deleteMany({
    where: { telegramId },
  });
}
