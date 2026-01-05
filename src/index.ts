import { AIBotAutonomous as AIBot, type TelegramMessage } from './ai-bot-autonomous';

export interface Env {
  GEMINI_API_KEY: string;
  API_TELEGRAM: string;
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
        if (!body.message) {
          console.log('❌ No message found');
          return new Response('OK', { status: 200 });
        }

        const message: TelegramMessage = body.message;

        // Nếu không có text, không xử lý tiếp
        if (!message.text) {
          console.log('⏭️ No text in message - skipping');
          return new Response('OK', { status: 200 });
        }

        // 📝 LOG: In ra message được xử lý
        console.log('=== PROCESSING MESSAGE ===');
        console.log('From:', message.from?.first_name, `(ID: ${message.from?.id})`);
        console.log('Chat:', message.chat.type, `(ID: ${message.chat.id})`);
        console.log('Text:', message.text);

        // Kiểm tra xem có nên phản hồi không (chỉ áp dụng cho group)
        const shouldRespond = shouldRespondInGroup(body);
        
        if (shouldRespond) {
          // Trigger bot: xử lý message (lưu tin nhắn sẽ được xử lý bên trong processMessageWithMessagesAndStickers)
          ctx.waitUntil(aiBot.processMessageWithMessagesAndStickers(message, env.API_TELEGRAM, ctx));
          console.log('✅ Message processing started (non-blocking)');
        } else {
          // Không trigger bot: lưu tin nhắn non-blocking để có context sau này
          ctx.waitUntil(
            (async () => {
              try {
                await aiBot.database.ensureUserAndGroup(message);
                await aiBot.database.saveUserMessage(message);
                console.log('✅ User message saved to DB (non-blocking)');
              } catch (error) {
                console.error('❌ Failed to save user message:', error);
              }
            })()
          );
          console.log('🚫 Skipping AI processing - not a reply to bot or missing keywords');
        }

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
          `https://api.telegram.org/bot${env.API_TELEGRAM}/setWebhook`,
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

    return new Response(JSON.stringify({
      message: 'Mayishere API',
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

// Kiểm tra xem bot có nên phản hồi trong group không
function shouldRespondInGroup(body: any): boolean {
  const message = body.message;

  // Nếu là private chat, luôn phản hồi
  if (message.chat.type === 'private') {
    console.log('✅ Private chat - responding');
    return true;
  }

  // Nếu là group/supergroup, kiểm tra điều kiện
  if (message.chat.type === 'group' || message.chat.type === 'supergroup') {

    // 1. Kiểm tra xem có phải reply tin nhắn của bot không
    if (message.reply_to_message) {
      const repliedTo = message.reply_to_message;
      const isReplyToBot = repliedTo.from?.is_bot === true ||
        repliedTo.from?.username?.toLowerCase().includes('bot');

      if (isReplyToBot) {
        console.log('✅ Reply to bot message - responding');
        return true;
      }
    }

    // 2. Kiểm tra các từ khóa trigger
    const text = message.text.toLowerCase();
    const keywords = ['nợ', 'meismaybot', 'mây'];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        console.log(`✅ Keyword "${keyword}" found - responding`);
        return true;
      }
    }

    // 3. Kiểm tra mention bot (nếu có @username)
    if (text.includes('@') && text.includes('meismaybot')) {
      console.log('✅ Bot mention found - responding');
      return true;
    }

    console.log('🚫 No trigger conditions met in group');
    return false;
  }

  // Mặc định không phản hồi cho các loại chat khác
  return false;
}


