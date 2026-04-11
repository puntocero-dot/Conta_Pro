import { sendTelegramRequest } from '../src/lib/telegram';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno manualmente para el script
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const RAILWAY_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_STATIC_URL;

async function setup() {
  if (!RAILWAY_URL) {
    console.error('❌ Error: RAILWAY_STATIC_URL o NEXT_PUBLIC_APP_URL no configurada.');
    console.log('Por favor, asegúrate de que tu aplicación tenga una URL pública asignada.');
    return;
  }

  const webhookUrl = `${RAILWAY_URL}/api/telegram/webhook`;
  console.log(`🚀 Configurando Webhook en: ${webhookUrl}`);

  const result = await sendTelegramRequest('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
  });

  if (result.ok) {
    console.log('✅ Webhook configurado exitosamente en Telegram.');
  } else {
    console.error('❌ Error al configurar Webhook:', result.description);
  }
}

setup();
