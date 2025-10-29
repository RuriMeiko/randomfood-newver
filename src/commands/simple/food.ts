import type { ModernCommand } from '@/bot/types';
import type { TelegramExecutionContext } from '@/telegram/context';
import { SimpleFoodService } from '@/services/simple-food.service';
import { log } from '@/utils/logger';

export function createSimpleFoodCommands(foodService: SimpleFoodService): ModernCommand[] {
  return [
    {
      name: 'start',
      description: 'Welcome message',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const user = ctx.getUser();
        const welcomeText = `🎉 Chào mừng đến với Random Food Bot, ${user?.first_name || 'bạn'}!

🤖 Tôi sử dụng AI Gemini để gợi ý món ăn ngẫu nhiên cho bạn!

📋 Lệnh có sẵn:
🍽️ /food - Gợi ý món ăn ngẫu nhiên
📝 /food [mô tả] - Gợi ý theo yêu cầu của bạn
📊 /history - Xem lịch sử gợi ý

👥 Sử dụng trong nhóm:
• Dùng lệnh /food bình thường
• Hoặc mention bot: @randomfoodruribot món gì ngon?
• Bot chỉ trả lời khi được mention hoặc dùng lệnh

Ví dụ:
• /food
• /food món Việt Nam
• @randomfoodruribot món chay cho bữa trưa
• @randomfoodruribot món ngọt tráng miệng

Hãy thử /food để bắt đầu! 🎲`;

        log.user.action('bot_started', ctx.user_id?.toString() || '', { username: user?.username });
        await ctx.sendMessage(welcomeText);
      }
    },

    {
      name: 'food',
      description: 'Generate random food suggestion using AI',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const userId = ctx.user_id?.toString();
        const chatId = ctx.chat_id?.toString();
        
        if (!userId || !chatId) {
          await ctx.sendMessage('❌ Không thể xử lý yêu cầu. Vui lòng thử lại.');
          return;
        }

        // Show typing indicator
        await ctx.sendMessage('🤖 Đang tạo gợi ý món ăn cho bạn...');

        try {
          const userPrompt = args.length > 0 ? args.join(' ') : undefined;
          
          log.command.executed('/food', userId, true, Date.now());

          // Get AI suggestion
          const result = await foodService.getRandomFoodSuggestion(userId, chatId, userPrompt);
          
          if (!result.success) {
            await ctx.editMessage(`❌ Không thể tạo gợi ý lúc này: ${result.error}\n\n🔄 Vui lòng thử lại sau.`);
            return;
          }

          // Format response
          let responseText = `🤖 <b>Gợi ý món ăn từ AI:</b>\n\n`;
          responseText += `${result.suggestion}\n\n`;
          
          if (userPrompt) {
            responseText += `💭 <i>Dựa trên yêu cầu: "${userPrompt}"</i>\n\n`;
          }
          
          responseText += `🔄 Gửi /food để có gợi ý khác\n`;
          responseText += `📊 Gửi /history để xem lịch sử gợi ý`;

          await ctx.editMessage(responseText);

        } catch (error: any) {
          log.error('Error in food command', error, { userId, chatId });
          await ctx.editMessage('❌ Có lỗi xảy ra khi tạo gợi ý. Vui lòng thử lại!');
        }
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
          const history = await foodService.getUserHistory(userId, 5);
          const totalCount = await foodService.getUserSuggestionsCount(userId);

          if (history.length === 0) {
            await ctx.sendMessage(`📊 <b>Lịch sử gợi ý món ăn</b>\n\n🤷‍♂️ Chưa có gợi ý nào.\n\n💡 Sử dụng /food để bắt đầu!`);
            return;
          }

          let content = `📊 <b>Lịch sử gợi ý món ăn</b>\n`;
          content += `📈 Tổng cộng: ${totalCount} gợi ý\n\n`;

          history.forEach((item, index) => {
            const date = new Date(item.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit', 
              hour: '2-digit',
              minute: '2-digit'
            });
            
            content += `${index + 1}. ${item.suggestion.substring(0, 50)}${item.suggestion.length > 50 ? '...' : ''}\n`;
            content += `   📅 ${date}`;
            if (item.prompt) {
              content += ` • 💭 "${item.prompt}"`;
            }
            content += `\n\n`;
          });

          content += `🔄 Sử dụng /food để tạo gợi ý mới!`;

          await ctx.sendMessage(content);

          log.user.action('history_viewed', userId, { count: history.length, total: totalCount });

        } catch (error: any) {
          log.error('Error in history command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Lỗi khi tải lịch sử. Vui lòng thử lại!');
        }
      }
    },

    {
      name: 'help',
      description: 'Show help information',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const helpText = `🤖 <b>Random Food Bot - Hướng dẫn</b>

🎯 <b>Chức năng:</b>
Sử dụng AI Gemini để gợi ý món ăn ngẫu nhiên theo yêu cầu của bạn

📋 <b>Các lệnh:</b>
🍽️ /food - Gợi ý món ăn ngẫu nhiên
📝 /food [mô tả] - Gợi ý theo yêu cầu cụ thể
📊 /history - Xem lịch sử 5 gợi ý gần nhất
❓ /help - Hiển thị hướng dẫn này

👥 <b>Sử dụng trong nhóm:</b>
• Dùng lệnh /food bình thường
• Hoặc mention bot: @randomfoodruribot món gì ngon?
• Bot chỉ trả lời khi được mention hoặc dùng lệnh
• Không spam trong nhóm - chỉ trả lời khi cần

💡 <b>Ví dụ sử dụng:</b>
• /food
• /food món Việt Nam truyền thống
• @randomfoodruribot món chay cho bữa trưa
• @randomfoodruribot món tráng miệng ngọt mát
• "food bot gợi ý đồ ăn vặt"

🚀 Hãy thử ngay /food để bắt đầu!`;

        await ctx.sendMessage(helpText);
        log.user.action('help_viewed', ctx.user_id?.toString() || '');
      }
    }
  ];
}