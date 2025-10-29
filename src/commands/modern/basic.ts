import type { ModernCommand } from '@/bot/types';
import type { TelegramExecutionContext } from '@/telegram/context';
import type NeonDB from '@/db/neon';
import { log } from '@/utils/logger';

export function createModernBasicCommands(database: NeonDB): ModernCommand[] {
  return [
    {
      name: 'start',
      description: 'Welcome message',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const user = ctx.getUser();
        const welcomeText = `🎉 Welcome to Random Food Bot, ${user?.first_name || 'friend'}!

🍽️ I can help you decide what to eat today!

📋 Available commands:
/randomfood - Get a random food suggestion
/help - Show all commands
/about - About this bot

Let's start with /randomfood! 🎲`;

        log.user.action('bot_started', ctx.user_id?.toString() || '', { username: user?.username });
        await ctx.sendMessage(welcomeText);
      }
    },

    {
      name: 'help',
      description: 'Show available commands',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          // Get help data from database
          const helpData = await database.find('credit', {});
          
          let helpText = '📋 <b>Available Commands:</b>\n\n';
          
          if (helpData.length > 0 && helpData[0].data) {
            helpText += helpData[0].data;
          } else {
            // Fallback help text
            helpText += `🍽️ <b>Food Commands:</b>
/randomfood - Get random food suggestion
/randomfoodhistory - View your food history

🔧 <b>Utility Commands:</b>
/start - Welcome message
/about - About this bot
/checkdate - Anniversary calculator (admin)

👥 <b>Social Commands:</b>
/all - Tag all users`;
          }

          helpText += '\n\n💡 <i>Tip: Use these commands to discover new foods!</i>';

          log.user.action('help_viewed', ctx.user_id?.toString() || '');
          await ctx.sendMessage(helpText);
        } catch (error: any) {
          log.error('Error fetching help data', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Error loading help. Please try again later.');
        }
      }
    },

    {
      name: 'about',
      description: 'About this bot',
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        const aboutText = `🤖 <b>Random Food Bot</b>

🎯 <b>Purpose:</b> Help you decide what to eat when you're indecisive!

⚡ <b>Features:</b>
• Random food suggestions
• Food history tracking
• Paginated history viewing
• Admin tools for management

🏗️ <b>Tech Stack:</b>
• Cloudflare Workers
• Neon PostgreSQL
• Modern TypeScript
• Telegram Bot API

🔧 <b>Version:</b> 2.0 (Modernized Architecture)

📝 <b>Developer:</b> Built with ❤️ for food lovers

🚀 Use /randomfood to get started!`;

        log.user.action('about_viewed', ctx.user_id?.toString() || '');
        await ctx.sendMessage(aboutText);
      }
    }
  ];
}