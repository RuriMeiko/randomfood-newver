import type { Command } from '@/commands/types';
import type { BotContext, TelegramBot } from '@/bot/types';
import type NeonDB from '@/db/neon';

export function createBasicCommands(db: NeonDB): Command[] {
  return [
    {
      name: '/start',
      description: 'Bắt đầu sử dụng bot',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        // Get user info from context or message
        const welcomeText = `Chào mừng bạn đến với Random Food Bot!\nBấm /help để xem hướng dẫn 😉`;
        await bot.sendMessage(welcomeText, context.chatId, context.threadId);
      }
    },
    
    {
      name: '/help',
      description: 'Xem hướng dẫn sử dụng',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        const result = await db.collection('credit').find();
        const helpData = result.documents[0]?.data || {
          help: [
            '/start - Bắt đầu sử dụng bot',
            '/help - Xem hướng dẫn',
            '/randomfood - Gợi ý món ăn ngẫu nhiên',
            '/randomfoodhistory - Xem lịch sử gợi ý',
            '/debt - Xem nợ hiện tại',
            '/debtcreate - Tạo nợ mới',
            '/all - Tag tất cả thành viên',
            '/about - Thông tin về bot'
          ]
        };
        
        const helpText = helpData.help.join('\n');
        await bot.sendMessage(helpText, context.chatId, context.threadId);
      }
    },
    
    {
      name: '/about',
      description: 'Thông tin về bot',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        const text = 'Bot này tạo ra bởi <b>nthl</b> aka <b>rurimeiko</b> ヽ(✿ﾟ▽ﾟ)ノ';
        await bot.sendMessage(text, context.chatId, context.threadId);
      }
    }
  ];
}