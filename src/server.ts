/**
 * Express Server for VPS Deployment
 * Replaces Cloudflare Workers with traditional HTTP server
 */

import express, { type Request, type Response } from 'express';
import { AIBotAutonomous as AIBot, type TelegramMessage } from './ai-bot-autonomous';
import { getWebhookUIHTML } from './utils/webhook-ui';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log(process.env);

// Environment validation
const requiredEnvVars = ['API_TELEGRAM', 'NEON_DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize AI Bot (single instance, no need for per-request init)
const aiBot = new AIBot(process.env.NEON_DATABASE_URL!);
console.log('✅ AI Bot initialized');

// Debounce settings
const DEBOUNCE_DELAY = 2500; // 2.5 seconds
const pendingMessages = new Map<string, {
  timeout: NodeJS.Timeout;
  messages: TelegramMessage[];
  lastMessage: TelegramMessage;
}>();

// Basic Auth middleware
function checkBasicAuth(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  return username === process.env.WEBHOOK_ADMIN_USER && 
         password === process.env.WEBHOOK_ADMIN_PASSWORD;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Webhook setup UI
app.get('/webhook-ui', (req: Request, res: Response) => {
  if (!checkBasicAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Webhook Setup"');
    return res.status(401).send('Unauthorized');
  }

  const authHeader = req.headers.authorization || '';
  const html = getWebhookUIHTML(`${req.protocol}://${req.get('host')}/webhook`, authHeader);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// API endpoint to set webhook
app.post('/api/set-webhook', async (req: Request, res: Response) => {
  if (!checkBasicAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Webhook URL is required' 
      });
    }

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.API_TELEGRAM}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      }
    );

    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

// Helper function to determine if bot should respond in group
function shouldRespondInGroup(body: any): boolean {
  const message = body.message;
  if (!message) return false;

  // Check if message has text
  if (!message.text) {
    console.log('🚫 No text in message - not responding');
    return false;
  }

  // Always respond in private chats
  if (message.chat.type === 'private') {
    console.log('✅ Private chat - responding');
    return true;
  }

  // In groups: respond if bot is mentioned, message is a reply to bot, or contains keywords
  const botUsername = process.env.BOT_USERNAME || 'randomfood_newver_bot';
  const text = message.text.toLowerCase();
  
  // Check if bot is mentioned
  if (text.includes(`@${botUsername.toLowerCase()}`)) {
    console.log('✅ Bot mention found - responding');
    return true;
  }
  
  // Check if message is a reply to bot
  if (message.reply_to_message?.from?.is_bot) {
    console.log('✅ Reply to bot message - responding');
    return true;
  }

  // Check for keywords
  const keywords = ['nợ', 'meismaybot', 'mây'];
  
  console.log('🔍 Checking keywords...');
  console.log('  Original text:', message.text);
  console.log('  Text (lowercase):', text);
  console.log('  Text length:', text.length);

  for (const keyword of keywords) {
    const found = text.includes(keyword);
    console.log(`  Checking "${keyword}": ${found}`);
    if (found) {
      console.log(`✅ Keyword "${keyword}" found - responding`);
      return true;
    }
  }

  console.log('🚫 No trigger conditions met in group');
  return false;
}

// Webhook endpoint for Telegram
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    console.log('=== WEBHOOK INPUT ===');
    console.log('Request Body:', JSON.stringify(body, null, 2));

    // Check if message exists
    if (!body.message) {
      console.log('❌ No message found');
      return res.status(200).send('OK');
    }

    const message: TelegramMessage = body.message;

    // Skip if no text
    if (!message.text) {
      console.log('⏭️ No text in message - skipping');
      return res.status(200).send('OK');
    }

    console.log('=== PROCESSING MESSAGE ===');
    console.log('From:', message.from?.first_name, `(ID: ${message.from?.id})`);
    console.log('Chat:', message.chat.type, `(ID: ${message.chat.id})`);
    console.log('Text:', message.text);

    // Check if bot should respond
    const shouldRespond = shouldRespondInGroup(body);
    
    if (shouldRespond) {
      // Use debounce - wait to see if user sends more messages
      const chatKey = `${message.chat.id}_${message.from?.id}`;
      
      // Clear existing timeout if any
      if (pendingMessages.has(chatKey)) {
        const pending = pendingMessages.get(chatKey)!;
        clearTimeout(pending.timeout);
        pending.messages.push(message);
        pending.lastMessage = message;
        console.log(`⏱️ Debouncing message (${pending.messages.length} messages queued)...`);
      } else {
        pendingMessages.set(chatKey, {
          timeout: null as any,
          messages: [message],
          lastMessage: message
        });
        console.log('⏱️ Starting debounce timer...');
      }
      
      // Set new timeout
      const pending = pendingMessages.get(chatKey)!;
      pending.timeout = setTimeout(async () => {
        const messagesToProcess = pending.messages;
        const lastMsg = pending.lastMessage;
        pendingMessages.delete(chatKey);
        
        console.log(`✅ Debounce timer expired - processing ${messagesToProcess.length} message(s)...`);
        
        // Process the last message (most recent)
        try {
          await aiBot.processMessageWithMessagesAndStickers(
            lastMsg, 
            process.env.API_TELEGRAM!
          );
          console.log('✅ Message processing complete');
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      }, DEBOUNCE_DELAY);
      
      console.log(`⏱️ Debounce active - will process in ${DEBOUNCE_DELAY}ms`);
    } else {
      // Save message without AI response (async)
      setImmediate(async () => {
        try {
          await aiBot.database.ensureUserAndGroup(message);
          await aiBot.database.saveUserMessage(message);
          console.log('✅ User message saved to DB');
        } catch (error) {
          console.error('❌ Failed to save user message:', error);
        }
      });
      
      console.log('🚫 Skipping AI processing - not a reply to bot or missing keywords');
    }

    // Return immediately to Telegram
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Telegram
  }
});

// Get webhook info
app.get('/api/webhook-info', async (req: Request, res: Response) => {
  if (!checkBasicAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.API_TELEGRAM}/getWebhookInfo`
    );
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Webhook UI: http://localhost:${PORT}/webhook-ui`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
