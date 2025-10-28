import type { Command } from '@/commands/types';
import type { BotContext, TelegramBot } from '@/bot/types';
import { FoodService } from '@/services/food.service';
import type NeonDB from '@/db/neon';

export function createFoodCommands(db: NeonDB): Command[] {
  const foodService = new FoodService(db);
  
  return [
    {
      name: '/randomfood',
      description: 'Gợi ý món ăn ngẫu nhiên',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        // Check if user already got suggestion today
        const hasRandomizedToday = await foodService.hasRandomizedToday(context.userId);
        
        if (hasRandomizedToday) {
          await bot.sendSticker(
            'CAACAgIAAxkBAAEot_VlmvKyl62IGNoRf6p64AqordsrkAACyD8AAuCjggeYudaMoCc1bzQE',
            context.chatId,
            context.threadId
          );
          await bot.sendMessage(
            'Cậu đã được gợi ý roài, tớ hong gợi ý thêm món nữa đauuu',
            context.chatId,
            context.threadId
          );
          return;
        }

        // Get random main food
        let mainFood = await foodService.getRandomFood();
        
        // Avoid duplicate with last suggestion
        const lastRandom = await foodService.getLastRandomFood(context.userId);
        if (lastRandom) {
          while (mainFood.id === lastRandom.food) {
            mainFood = await foodService.getRandomFood();
          }
        }

        let subFood = null;
        if (!mainFood.only) {
          subFood = await foodService.getRandomSubFood();
        }

        // Save to history
        await foodService.saveRandomHistory(
          context.userId, 
          mainFood.id, 
          subFood?.id
        );

        // Create response message
        const searchUrl = foodService.makeSearchUrl(mainFood.name);
        let caption = `Tớ gợi ý nấu món <a href='${searchUrl}'>${mainFood.name}</a> thử nha 🤤\n`;
        
        if (subFood) {
          const subSearchUrl = foodService.makeSearchUrl(subFood.name);
          caption += `kết hợp với món phụ là <a href='${subSearchUrl}'>${subFood.name}</a> `;
        }
        
        caption += 'Cậu có thể thêm tuỳ biến dựa vào nhu cầu hiện tại nhé 🤭';

        await bot.sendPhoto(mainFood.img, context.chatId, caption, context.threadId);
      }
    },

    {
      name: '/randomfoodhistory',
      description: 'Xem lịch sử gợi ý món ăn',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        const page = parseInt(args) || 0;
        const limit = 3;
        const offset = page * limit;
        
        const history = await foodService.getFoodHistory(context.userId, limit + 1, offset);
        
        if (history.length === 0) {
          await bot.sendMessage(
            'Bạn chưa có lịch sử gợi ý món ăn nào!',
            context.chatId,
            context.threadId
          );
          return;
        }

        let content = `<b>Trang ${page + 1} 🚕</b>\n\n`;
        
        // Process history items (take only limit items for display)
        const displayItems = history.slice(0, limit);
        
        for (let i = 0; i < displayItems.length; i++) {
          const item = displayItems[i];
          const itemNumber = offset + i + 1;
          const time = new Date(item.randomAt);
          
          content += `${itemNumber}. <b>Ngày</b>: <code>${time.toLocaleString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh'
          })}</code>\n\n`;
          
          const mainFood = await foodService.getFoodById(item.food);
          if (mainFood) {
            content += `<b>Món chính</b>: <code>${mainFood.name}</code>`;
          }
          
          if (item.subfood) {
            const subFood = await foodService.getSubFoodById(item.subfood);
            if (subFood) {
              content += `\n<b>Món phụ</b>: <code>${subFood.name}</code>`;
            }
          }
          
          if (i < displayItems.length - 1) {
            content += '\n\n';
          }
        }

        // Create pagination keyboard
        let keyboard;
        if (history.length > limit) { // Has next page
          if (page === 0) {
            keyboard = [[{
              text: `Trang ${page + 2} 🚗`,
              callback_data: `next_${page + 1}`
            }]];
          } else {
            keyboard = [[
              {
                text: `Trang ${page} 🚓`,
                callback_data: `next_${page - 1}`
              },
              {
                text: `Trang ${page + 2} 🚗`,
                callback_data: `next_${page + 1}`
              }
            ]];
          }
        } else if (page > 0) {
          keyboard = [[{
            text: `Trang ${page} 🚓`,
            callback_data: `next_${page - 1}`
          }]];
        }

        if (context.isCallback && context.messageId) {
          await bot.editMessage(content, context.chatId, context.messageId, keyboard);
        } else {
          await bot.sendMessage(content, context.chatId, context.threadId, keyboard);
        }
      }
    }
  ];
}