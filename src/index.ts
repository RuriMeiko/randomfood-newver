import { AIBot, type TelegramMessage } from './ai-bot';
import { ModernTelegramBot } from './telegram/modern-client';

export interface Env {
  GEMINI_API_KEY: string;
  API_TELEGRAM: string;
  NEON_DATABASE_URL: string;
}

let aiBot: AIBot;
let telegramBot: ModernTelegramBot;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Set environment variables

    // Initialize AI Bot and Telegram Bot
    if (!aiBot) {
      aiBot = new AIBot(env.GEMINI_API_KEY, env.NEON_DATABASE_URL);
    }
    if (!telegramBot) {
      telegramBot = new ModernTelegramBot(env.API_TELEGRAM);
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

        // Kiểm tra xem có nên phản hồi không (chỉ áp dụng cho group)
        if (!shouldRespondInGroup(body)) {
          console.log('🚫 Skipping message - not a reply to bot or missing keywords');
          return new Response('OK', { status: 200 });
        }
        const api = telegramBot.getApi();

        try {
          await api.sendChatAction(message.chat.id, 'typing');
          console.log('✅ Typing action sent');
        } catch (typingError) {
          console.error('❌ Typing action error:', typingError);
        }
        // Xử lý message bằng AI bot và lấy messages array
        const aiResponse = await aiBot.processMessageWithMessages(message);

        // 📝 LOG: In ra response
        console.log('=== AI RESPONSE ===');
        console.log('Messages:', aiResponse.messages);

        // Gửi từng message với typing và delay
        await sendTelegramMessagesWithDelay(telegramBot, message.chat.id, aiResponse.messages);

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
    const keywords = ['ghi nợ', 'bot', 'mây'];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        console.log(`✅ Keyword "${keyword}" found - responding`);
        return true;
      }
    }

    // 3. Kiểm tra mention bot (nếu có @username)
    if (text.includes('@') && text.includes('bot')) {
      console.log('✅ Bot mention found - responding');
      return true;
    }

    console.log('🚫 No trigger conditions met in group');
    return false;
  }

  // Mặc định không phản hồi cho các loại chat khác
  return false;
}


async function sendTelegramMessagesWithDelay(bot: ModernTelegramBot, chatId: number, messages: { text: string; delay: string }[]) {
  const api = bot.getApi();

  for (const message of messages) {
    try {
      // Show typing indicator
      console.log('💬 Sending typing action...');
      try {
        await api.sendChatAction(chatId, 'typing');
        console.log('✅ Typing action sent');
      } catch (typingError) {
        console.error('❌ Typing action error:', typingError);
      }

      // Wait for the delay
      const delayMs = parseInt(message.delay) || 1000;
      console.log(`⏱️ Waiting ${delayMs}ms before sending: "${message.text}"`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Send the message
      console.log('📤 Sending message:', message.text);
      try {
        const result = await api.sendMessage({
          chat_id: chatId,
          text: message.text
        });
        console.log('✅ Message sent successfully:', result.result?.message_id);
      } catch (sendError) {
        console.error('❌ Message send error:', sendError);
      }

    } catch (error) {
      console.error('Error sending message:', message.text, error);
    }
  }
}