// Simple AI Chat Bot with Database History
import { AIService } from './ai';

// Database connection string từ environment
const DB_CONNECTION_STRING = 'postgresql://neondb_owner:npg_Ur3GEKgwmD9O@ep-soft-poetry-a18vskpw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Khởi tạo AI service
const aiService = new AIService(DB_CONNECTION_STRING);

// Main handler function
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // API endpoint để chat với AI
      if (url.pathname === '/chat' && request.method === 'POST') {
        const body = await request.json();
        const { chatId, userId, username, message } = body;
        
        if (!chatId || !userId || !message) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const response = await aiService.chat(chatId, userId, username || 'Anonymous', message);
        
        return new Response(JSON.stringify({ response }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // API endpoint để cập nhật system prompt
      if (url.pathname === '/system-prompt' && request.method === 'POST') {
        const body = await request.json();
        const { chatId, systemPrompt, personalityTraits } = body;
        
        if (!chatId || !systemPrompt) {
          return new Response(JSON.stringify({ error: 'Missing chatId or systemPrompt' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await aiService.updateSystemPrompt(chatId, systemPrompt, personalityTraits);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // API endpoint để lấy lịch sử chat
      if (url.pathname === '/history' && request.method === 'GET') {
        const chatId = url.searchParams.get('chatId');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        if (!chatId) {
          return new Response(JSON.stringify({ error: 'Missing chatId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const history = await aiService.getChatHistory(chatId, limit);
        
        return new Response(JSON.stringify({ history }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Welcome message
      return new Response(JSON.stringify({ 
        message: 'AI Chat Bot API',
        endpoints: {
          'POST /chat': 'Chat with AI',
          'POST /system-prompt': 'Update system prompt',
          'GET /history?chatId=xxx': 'Get chat history'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};