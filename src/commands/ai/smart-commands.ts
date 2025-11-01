import type { ModernCommand } from '@/bot/types';
import type { TelegramExecutionContext } from '@/telegram/context';
import { AIBotService } from '@/services/ai-bot.service';
import { log } from '@/utils/logger';

export function createAICommands(aiBotService: AIBotService): ModernCommand[] {
  return [
    {
      name: 'start',
      description: 'Welcome message with AI capabilities',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const user = ctx.getUser();
        const isGroup = ctx.isGroupChat();
        
        const welcomeText = `Chào ${user?.first_name || 'bạn'}! Tôi có thể giúp bạn gợi ý món ăn và theo dõi các khoản nợ trong nhóm.

Tôi được trang bị AI để:
- Gợi ý món ăn phù hợp sinh viên, dễ nấu, nguyên liệu đơn giản
- Tự động ghi nhận khi ai nợ ai từ cách nói chuyện tự nhiên
- Trò chuyện và hỗ trợ như một người bạn

${isGroup ? 
`Trong nhóm này, bạn có thể:
- Tag @randomfoodruribot để tôi phản hồi
- Hoặc dùng các lệnh /start, /help
- Tôi sẽ tự động theo dõi thành viên để quản lý nợ` :
`Trong chat riêng:
- Nhắn bất kỳ gì, tôi sẽ hiểu và trả lời
- Hỏi về món ăn, nói về tiền nợ, hay chỉ trò chuyện`}

Thử hỏi tôi về món ăn hoặc chỉ nói chuyện bình thường nhé!`;

        log.user.action('ai_bot_started', ctx.user_id?.toString() || '', { 
          username: user?.username,
          isGroup
        });
        
        await ctx.sendMessage(welcomeText);
      }
    },

    {
      name: 'history',
      description: 'View your food suggestion history',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const userId = ctx.user_id?.toString();
        
        if (!userId) {
          await ctx.sendMessage('❌ Không thể truy cập lịch sử. Vui lòng thử lại.');
          return;
        }

        try {
          const history = await aiBotService.getUserFoodHistory(userId, 5);

          if (history.length === 0) {
            await ctx.sendMessage(`Lịch sử gợi ý món ăn

Chưa có gợi ý nào. Hãy hỏi tôi về món ăn nhé!`);
            return;
          }

          let content = `Lịch sử gợi ý món ăn của bạn:\n\n`;

          history.forEach((item, index) => {
            const date = new Date(item.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit', 
              hour: '2-digit',
              minute: '2-digit'
            });
            
            content += `${index + 1}. ${item.suggestion}\n`;
            content += `   ${date}`;
            if (item.prompt) {
              content += ` - "${item.prompt}"`;
            }
            content += `\n\n`;
          });

          content += `Hỏi tôi về món ăn để có thêm gợi ý nhé!`;

          await ctx.sendMessage(content);

          log.user.action('ai_history_viewed', userId, { count: history.length });

        } catch (error: any) {
          log.error('Error in AI history command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Lỗi khi tải lịch sử. Vui lòng thử lại!');
        }
      }
    },

    {
      name: 'debts',
      description: 'View debt information for this chat',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const chatId = ctx.chat_id?.toString();
        
        if (!chatId) {
          await ctx.sendMessage('❌ Không thể truy cập thông tin nợ.');
          return;
        }

        try {
          const showAll = args.includes('all');
          const debts = await aiBotService.getChatDebts(chatId, !showAll);

          if (debts.length === 0) {
            const message = showAll ? 
              '💰 Không có khoản nợ nào trong nhóm này.' :
              '💰 Không có khoản nợ chưa trả trong nhóm này.\n\n💡 Dùng /debts all để xem tất cả.';
            await ctx.sendMessage(message);
            return;
          }

          let content = `💰 <b>Thông tin nợ ${showAll ? '' : 'chưa trả '}trong nhóm</b>\n\n`;

          const unpaidDebts = debts.filter(d => !d.isPaid);
          const paidDebts = debts.filter(d => d.isPaid);

          if (unpaidDebts.length > 0) {
            content += `🔴 <b>Chưa trả (${unpaidDebts.length}):</b>\n`;
            unpaidDebts.forEach((debt, index) => {
              const amount = parseFloat(debt.amount).toLocaleString('vi-VN');
              const date = new Date(debt.createdAt).toLocaleDateString('vi-VN');
              
              content += `${index + 1}. ${debt.debtorUsername} nợ ${debt.creditorUsername}\n`;
              content += `   💵 ${amount} ${debt.currency}\n`;
              if (debt.description) {
                content += `   📝 ${debt.description}\n`;
              }
              content += `   📅 ${date}\n\n`;
            });
          }

          if (showAll && paidDebts.length > 0) {
            content += `✅ <b>Đã trả (${paidDebts.length}):</b>\n`;
            paidDebts.slice(0, 3).forEach((debt, index) => {
              const amount = parseFloat(debt.amount).toLocaleString('vi-VN');
              const paidDate = debt.paidAt ? new Date(debt.paidAt).toLocaleDateString('vi-VN') : 'N/A';
              
              content += `${index + 1}. ${debt.debtorUsername} → ${debt.creditorUsername}\n`;
              content += `   💵 ${amount} ${debt.currency} • ✅ ${paidDate}\n\n`;
            });
          }

          if (!showAll && paidDebts.length > 0) {
            content += `\n💡 Dùng /debts all để xem ${paidDebts.length} khoản đã trả.`;
          }

          content += `\n🤖 Nói với tôi về việc vay/trả tiền để tự động cập nhật!`;

          await ctx.sendMessage(content);

          log.user.action('ai_debts_viewed', ctx.user_id?.toString() || '', { 
            chatId, 
            totalDebts: debts.length,
            unpaidCount: unpaidDebts.length,
            showAll 
          });

        } catch (error: any) {
          log.error('Error in AI debts command', error, { chatId: ctx.chat_id });
          await ctx.sendMessage('❌ Lỗi khi tải thông tin nợ. Vui lòng thử lại!');
        }
      }
    },

    {
      name: 'help',
      description: 'AI bot help information',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const isGroup = ctx.isGroupChat();
        
        const helpText = `🤖 <b>AI Food & Debt Bot - Hướng dẫn</b>

🧠 <b>Tính năng AI thông minh:</b>
• Hiểu ngôn ngữ tự nhiên
• Phân tích ý định và phản hồi phù hợp
• Ghi nhớ thành viên nhóm

📋 <b>Lệnh có sẵn:</b>
🍽️ /history - Xem lịch sử gợi ý món ăn
💰 /debts - Xem nợ chưa trả trong nhóm
💰 /debts all - Xem tất cả các khoản nợ
❓ /help - Hiển thị hướng dẫn này

🍽️ <b>Gợi ý món ăn:</b>
• "Hôm nay ăn gì?" → AI gợi ý món phù hợp
• "Món chay cho bữa trưa" → Gợi ý cụ thể
• "Đói bụng, không biết nấu gì" → AI hỏi thêm rồi gợi ý

💰 <b>Quản lý nợ tự động:</b>
• "Tôi nợ An 50k ăn trưa" → Tự động ghi nợ
• "An nợ tôi 100 nghìn" → Ghi nợ ngược lại  
• "Đã trả tiền cho Bình" → Đánh dấu đã trả
• "Ai nợ ai?" → Xem danh sách nợ

${isGroup ? 
`👥 <b>Sử dụng trong nhóm:</b>
• Tag @randomfoodruribot để AI phản hồi
• Hoặc dùng /lệnh bình thường
• AI tự động theo dõi ai nợ ai
• Không spam - chỉ trả lời khi được gọi` :
`💬 <b>Chat riêng:</b>
• Nhắn bất kỳ → AI tự động phản hồi
• Không cần tag hay lệnh đặc biệt`}

💡 <b>Mẹo sử dụng:</b>
• Nói chuyện tự nhiên với AI
• AI hiểu ngữ cảnh và ý định
• Càng chi tiết thì AI càng chính xác

🤖 Hãy thử nói chuyện với tôi! Tôi hiểu tiếng Việt và sẵn sàng hỗ trợ 24/7!`;

        await ctx.sendMessage(helpText);
        log.user.action('ai_help_viewed', ctx.user_id?.toString() || '', { isGroup });
      }
    }
  ];
}