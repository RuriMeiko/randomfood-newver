import type { ModernCommand } from '@/bot/types';
import type { TelegramExecutionContext } from '@/telegram/context';
import type NeonDB from '@/db/neon';
import { TelegramValidator } from '@/utils/telegram-validator';
import { log } from '@/utils/logger';

export function createModernDebugCommands(database: NeonDB, botToken: string): ModernCommand[] {
  return [
    {
      name: 'debug',
      description: 'Debug bot status and token',
      adminOnly: true,
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          let debugInfo = `🔧 <b>Bot Debug Information</b>\n\n`;

          // Token validation
          const tokenResult = await TelegramValidator.validateBot(botToken);
          
          debugInfo += `🔑 <b>Token Status:</b>\n`;
          debugInfo += `• Valid: ${tokenResult.valid ? '✅' : '❌'}\n`;
          
          if (tokenResult.valid && tokenResult.botInfo) {
            debugInfo += `• Bot ID: ${tokenResult.botInfo.id}\n`;
            debugInfo += `• Username: @${tokenResult.botInfo.username}\n`;
            debugInfo += `• Name: ${tokenResult.botInfo.first_name}\n`;
            debugInfo += `• Can Join Groups: ${tokenResult.botInfo.can_join_groups ? '✅' : '❌'}\n`;
          }
          
          if (tokenResult.errors.length > 0) {
            debugInfo += `\n❌ <b>Errors:</b>\n`;
            tokenResult.errors.forEach(error => {
              debugInfo += `• ${error}\n`;
            });
          }

          // API connectivity test
          debugInfo += `\n🌐 <b>API Test:</b>\n`;
          try {
            const apiTest = await fetch('https://api.telegram.org/bot' + botToken + '/getMe');
            const apiResult = await apiTest.json();
            debugInfo += `• Status: ${apiTest.status} ${apiTest.statusText}\n`;
            debugInfo += `• Response: ${apiResult.ok ? '✅ OK' : '❌ ' + apiResult.description}\n`;
          } catch (error: any) {
            debugInfo += `• API Error: ${error.message}\n`;
          }

          // Environment check
          debugInfo += `\n⚙️ <b>Environment:</b>\n`;
          debugInfo += `• Update Type: ${ctx.update_type}\n`;
          debugInfo += `• Chat ID: ${ctx.chat_id}\n`;
          debugInfo += `• User ID: ${ctx.user_id}\n`;

          // Database check
          try {
            const dbTest = await database.find('foods', {}, 1);
            debugInfo += `• Database: ✅ Connected (${dbTest.length} foods found)\n`;
          } catch (error: any) {
            debugInfo += `• Database: ❌ Error - ${error.message}\n`;
          }

          debugInfo += `\n💡 <i>Use this info to diagnose issues</i>`;

          await ctx.sendMessage(debugInfo);

          log.user.action('debug_executed', ctx.user_id?.toString() || '', {
            tokenValid: tokenResult.valid,
            errors: tokenResult.errors
          });

        } catch (error: any) {
          log.error('Error in debug command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Error running debug. Check logs for details.');
        }
      }
    },

    {
      name: 'testapi',
      description: 'Test Telegram API connectivity',
      adminOnly: true,
      async execute(ctx: TelegramExecutionContext, args: string[]) {
        try {
          let testInfo = `🧪 <b>API Connectivity Test</b>\n\n`;

          // Test different API endpoints
          const tests = [
            { name: 'getMe', endpoint: 'getMe' },
            { name: 'sendMessage (this)', endpoint: 'sendMessage', params: { chat_id: ctx.chat_id, text: 'API Test ✅' } }
          ];

          for (const test of tests) {
            try {
              const url = `https://api.telegram.org/bot${botToken}/${test.endpoint}`;
              const options: RequestInit = { method: 'GET' };
              
              if (test.params) {
                options.method = 'POST';
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(test.params);
              }

              const response = await fetch(url, options);
              const result = await response.json();

              testInfo += `🔸 <b>${test.name}:</b>\n`;
              testInfo += `  • Status: ${response.status}\n`;
              testInfo += `  • Success: ${result.ok ? '✅' : '❌'}\n`;
              
              if (!result.ok) {
                testInfo += `  • Error: ${result.description}\n`;
              }
              testInfo += `\n`;

            } catch (error: any) {
              testInfo += `🔸 <b>${test.name}:</b> ❌ ${error.message}\n\n`;
            }
          }

          testInfo += `💡 <i>All tests completed</i>`;
          
          // Note: Don't send this via sendMessage if sendMessage test failed
          // Use the context method which has better error handling
          await ctx.sendMessage(testInfo);

        } catch (error: any) {
          log.error('Error in testapi command', error, { userId: ctx.user_id });
          await ctx.sendMessage('❌ Error running API tests.');
        }
      }
    }
  ];
}