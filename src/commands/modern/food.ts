import type { ModernCommand } from '@/bot/types';
import type { TelegramExecutionContext } from '@/telegram/context';
import type NeonDB from '@/db/neon';
import { FoodService } from '@/services/food.service';
import { log } from '@/utils/logger';

export function createModernFoodCommands(database: NeonDB): ModernCommand[] {
  const foodService = new FoodService(database);

  return [
    {
      name: 'randomfood',
      description: 'Get a random food suggestion',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          const userId = ctx.user_id?.toString();
          const chatId = ctx.chat_id?.toString();
          
          if (!userId || !chatId) {
            await ctx.sendMessage('❌ Unable to process request. Please try again.');
            return;
          }

          log.command.executed('/randomfood', userId, true, Date.now());

          // Get random food suggestion
          const suggestion = await foodService.getRandomFood();
          
          if (!suggestion) {
            await ctx.sendMessage('😔 No food suggestions available at the moment. Please try again later.');
            return;
          }

          // Save to history
          await foodService.saveRandomHistory(userId, suggestion.id, suggestion.subFoodId);

          // Format response
          let responseText = `🍽️ <b>Random Food Suggestion:</b>\n\n`;
          responseText += `🥘 <b>Main:</b> ${suggestion.mainFoodName}\n`;
          
          if (suggestion.subFoodName) {
            responseText += `🥗 <b>Side:</b> ${suggestion.subFoodName}\n`;
          }
          
          responseText += `\n💡 <i>Enjoy your meal!</i>`;
          responseText += `\n\n📝 Use /randomfoodhistory to see your food history`;

          await ctx.sendMessage(responseText);

          log.user.action('food_randomized', userId, { 
            foodId: suggestion.id,
            subFoodId: suggestion.subFoodId,
            mainFood: suggestion.mainFoodName,
            subFood: suggestion.subFoodName
          });

        } catch (error: any) {
          log.error('Error in randomfood command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Something went wrong getting your food suggestion. Please try again!');
        }
      }
    },

    {
      name: 'randomfoodhistory',
      description: 'View your food history',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          const userId = ctx.user_id?.toString();
          
          if (!userId) {
            await ctx.sendMessage('❌ Unable to access your history. Please try again.');
            return;
          }

          // Parse page number from args
          const page = args.length > 0 ? parseInt(args[0]) : 1;
          const validPage = isNaN(page) || page < 1 ? 1 : page;

          // Get history with pagination
          const history = await foodService.getUserHistory(userId, validPage, 5);

          if (!history || history.length === 0) {
            await ctx.sendMessage(`📝 <b>Food History</b>\n\n🤷‍♂️ No food history found.\n\n💡 Use /randomfood to start building your history!`);
            return;
          }

          // Format history response
          let content = `📝 <b>Your Food History</b> (Page ${validPage})\n\n`;

          history.forEach((item, index) => {
            const number = (validPage - 1) * 5 + index + 1;
            const date = new Date(item.randomAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            content += `${number}. 🍽️ <b>${item.mainFoodName}</b>`;
            if (item.subFoodName) {
              content += ` + 🥗 ${item.subFoodName}`;
            }
            content += `\n   📅 ${date}\n\n`;
          });

          // Add pagination buttons
          const keyboard = [];
          const row = [];

          if (validPage > 1) {
            row.push({ text: '⬅️ Previous', callback_data: `history_${validPage - 1}` });
          }

          // Check if there might be more pages (simplified check)
          if (history.length === 5) {
            row.push({ text: 'Next ➡️', callback_data: `history_${validPage + 1}` });
          }

          if (row.length > 0) {
            keyboard.push(row);
          }

          await ctx.sendMessage(content, {
            reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
          });

          log.user.action('history_viewed', userId, { page: validPage, count: history.length });

        } catch (error: any) {
          log.error('Error in randomfoodhistory command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Error loading your food history. Please try again!');
        }
      }
    }
  ];
}