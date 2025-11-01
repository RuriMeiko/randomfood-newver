import { AIBot, type TelegramMessage } from './ai-bot';

export interface Env {
  GEMINI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  NEON_DATABASE_URL: string;
}

let aiBot: AIBot;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Set environment variables

    // Initialize AI Bot
    if (!aiBot) {
      aiBot = new AIBot(env.GEMINI_API_KEY, env.NEON_DATABASE_URL);
    }

    const url = new URL(request.url);

    // Webhook endpoint for Telegram
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const body = await request.json() as any;

        // 📝 LOG: In ra toàn bộ input nhận được
        console.log('=== WEBHOOK INPUT ===');
        console.log('Request URL:', request.url);
        console.log('Request Body:', JSON.stringify(body, null, 2));

        // Kiểm tra có message không
        if (!body.message || !body.message.text) {
          console.log('❌ No message or text found');
          return new Response('OK', { status: 200 });
        }

        const message: TelegramMessage = body.message;

        // 📝 LOG: In ra message được xử lý
        console.log('=== PROCESSING MESSAGE ===');
        console.log('From:', message.from.first_name, `(ID: ${message.from.id})`);
        console.log('Chat:', message.chat.type, `(ID: ${message.chat.id})`);
        console.log('Text:', message.text);

        // Xử lý message bằng AI bot
        const response = await aiBot.processMessage(message);

        // 📝 LOG: In ra response
        console.log('=== AI RESPONSE ===');
        console.log('Response:', response);

        // Gửi response về Telegram
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, message.chat.id, response);

        console.log('✅ Message processed successfully');
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('❌ Webhook error:', error);
        return new Response('Error', { status: 500 });
      }
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('Debt Bot is running!', { status: 200 });
    }

    // Set webhook endpoint
    if (url.pathname === '/setup-webhook' && request.method === 'POST') {
      try {
        const webhookUrl = `${url.origin}/webhook`;
        const response = await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
          }
        );

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // API endpoint để test bot với message input
    if (url.pathname === '/test' && request.method === 'POST') {
      try {
        const body = await request.json() as { message: TelegramMessage };

        // 📝 LOG: In ra test input
        console.log('=== TEST INPUT ===');
        console.log('Test Body:', JSON.stringify(body, null, 2));
        console.log('Message Text:', body.message.text);
        console.log('From:', body.message.from.first_name, `(ID: ${body.message.from.id})`);

        const response = await aiBot.processMessage(body.message);

        // 📝 LOG: In ra test response
        console.log('=== TEST RESPONSE ===');
        console.log('AI Response:', response);

        return new Response(JSON.stringify({ response }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('❌ Test error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      message: 'Debt Tracking Bot API',
      endpoints: {
        'POST /webhook': 'Telegram webhook',
        'POST /setup-webhook': 'Setup Telegram webhook',
        'POST /test': 'Test bot with message',
        'GET /health': 'Health check'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
};

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}