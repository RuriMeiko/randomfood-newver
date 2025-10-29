import type { ModernCommand } from '@/bot/types';
import type { TelegramExecutionContext } from '@/telegram/context';
import type NeonDB from '@/db/neon';
import { log } from '@/utils/logger';

export function createModernSocialCommands(database: NeonDB): ModernCommand[] {
  return [
    {
      name: 'checkdate',
      description: 'Anniversary calculator',
      adminOnly: true,
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          if (args.length < 3) {
            await ctx.sendMessage(`📅 <b>Anniversary Calculator</b>

<b>Usage:</b> /checkdate DD MM YYYY

<b>Example:</b> /checkdate 15 02 2020

This will calculate how many days have passed since the given date.`);
            return;
          }

          const day = parseInt(args[0]);
          const month = parseInt(args[1]);
          const year = parseInt(args[2]);

          // Validate date inputs
          if (isNaN(day) || isNaN(month) || isNaN(year) || 
              day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
            await ctx.sendMessage('❌ Invalid date format. Please use: /checkdate DD MM YYYY\n\nExample: /checkdate 15 02 2020');
            return;
          }

          const startDate = new Date(year, month - 1, day);
          const currentDate = new Date();

          // Check if start date is in the future
          if (startDate > currentDate) {
            await ctx.sendMessage('❌ The date cannot be in the future!');
            return;
          }

          // Calculate difference
          const timeDiff = currentDate.getTime() - startDate.getTime();
          const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
          const yearsDiff = Math.floor(daysDiff / 365);
          const monthsDiff = Math.floor((daysDiff % 365) / 30);
          const remainingDays = daysDiff % 30;

          let responseText = `📅 <b>Anniversary Calculator</b>\n\n`;
          responseText += `📆 <b>Start Date:</b> ${day}/${month}/${year}\n`;
          responseText += `📆 <b>Today:</b> ${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}\n\n`;
          responseText += `⏰ <b>Time Passed:</b>\n`;
          responseText += `• 📅 ${daysDiff} days total\n`;
          responseText += `• 🗓️ ${yearsDiff} years, ${monthsDiff} months, ${remainingDays} days\n\n`;
          responseText += `🎉 <i>What an amazing journey!</i>`;

          await ctx.sendMessage(responseText);

          log.user.action('anniversary_calculated', ctx.user_id?.toString() || '', {
            startDate: `${day}/${month}/${year}`,
            daysPassed: daysDiff
          });

        } catch (error: any) {
          log.error('Error in checkdate command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Error calculating anniversary. Please check your date format and try again.');
        }
      }
    },

    {
      name: 'all',
      description: 'Tag all users (basic implementation)',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          // Basic implementation - in a real scenario, you'd get user list from database
          const user = ctx.getUser();
          const mentionText = `👥 <b>Attention everyone!</b>\n\n📢 ${user?.first_name || 'Someone'} is calling for attention!\n\n💡 <i>Note: Full user tagging requires additional implementation.</i>`;

          await ctx.sendMessage(mentionText);

          log.user.action('all_users_tagged', ctx.user_id?.toString() || '', { 
            chatId: ctx.chat_id?.toString(),
            username: user?.username 
          });

        } catch (error: any) {
          log.error('Error in all command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Error tagging users. Please try again.');
        }
      }
    }
  ];
}

// Callback handler for food history pagination
export async function handleHistoryCallback(ctx: TelegramExecutionContext, database: NeonDB): Promise<void> {
  try {
    if (!ctx.data?.startsWith('history_')) {
      return;
    }

    const page = parseInt(ctx.data.split('_')[1]) || 1;
    const userId = ctx.user_id?.toString();

    if (!userId) {
      await ctx.answerCallbackQuery('❌ Unable to load history');
      return;
    }

    const foodService = new (await import('@/services/food.service')).FoodService(database);
    const history = await foodService.getUserHistory(userId, page, 5);

    if (!history || history.length === 0) {
      await ctx.answerCallbackQuery('No more history available');
      return;
    }

    // Format new content
    let content = `📝 <b>Your Food History</b> (Page ${page})\n\n`;

    history.forEach((item, index) => {
      const number = (page - 1) * 5 + index + 1;
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

    // Update pagination buttons
    const keyboard = [];
    const row = [];

    if (page > 1) {
      row.push({ text: '⬅️ Previous', callback_data: `history_${page - 1}` });
    }

    if (history.length === 5) {
      row.push({ text: 'Next ➡️', callback_data: `history_${page + 1}` });
    }

    if (row.length > 0) {
      keyboard.push(row);
    }

    await ctx.editMessage(content, {
      reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
    });

    await ctx.answerCallbackQuery(`📄 Page ${page}`);

    log.user.action('history_page_changed', userId, { page, count: history.length });

  } catch (error: any) {
    log.error('Error handling history callback', error, { 
      userId: ctx.user_id, 
      callbackData: ctx.data 
    });
    await ctx.answerCallbackQuery('❌ Error loading page');
  }
}