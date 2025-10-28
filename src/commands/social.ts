import type { Command } from '@/commands/types';
import type { BotContext, TelegramBot } from '@/bot/types';
import type NeonDB from '@/db/neon';
import anni from '@/anniversary';

export function createSocialCommands(db: NeonDB): Command[] {
  return [
    {
      name: '/checkdate',
      description: 'Kiểm tra ngày anniversary (chỉ cho admin)',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        const userId = parseInt(context.userId);
        
        // Check if user is authorized
        if (userId !== 1775446945 && userId !== 6831903438) {
          await bot.sendMessage('Kiếm ngiu đi mấy a zai!', context.chatId);
          return;
        }

        function convertMilliseconds(milliseconds: number, check: boolean = false): string {
          if (milliseconds < 0) {
            return 'Thời gian không hợp lệ';
          }
          
          const secondsInAMinute = 60;
          const secondsInAnHour = 3600;
          const secondsInADay = 86400;
          const secondsInAWeek = 604800;
          const secondsInAMonth = 2592000; // 30 days
          const secondsInAYear = 31536000; // 365 days
          
          const seconds = milliseconds / 1000;
          
          if (seconds < secondsInAMinute) {
            return `${Math.round(seconds)} giây`;
          } else if (seconds < secondsInAnHour) {
            return `${Math.round(seconds / secondsInAMinute)} phút`;
          } else if (seconds < secondsInADay) {
            return `${Math.round(seconds / secondsInAnHour)} giờ`;
          } else if (seconds < secondsInAWeek || check) {
            const days = Math.floor(seconds / secondsInADay);
            const remainingHours = Math.floor((seconds % secondsInADay) / secondsInAnHour);
            const remainingMinutes = Math.floor(((seconds % secondsInADay) % secondsInAnHour) / secondsInAMinute);
            const remainingSeconds = Math.round(((seconds % secondsInADay) % secondsInAnHour) % secondsInAMinute);
            return `${days} ngày ${remainingHours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`;
          } else if (seconds < secondsInAMonth) {
            const weeks = Math.floor(seconds / secondsInAWeek);
            const remainingDays = Math.floor((seconds % secondsInAWeek) / secondsInADay);
            const remainingHours = Math.floor(((seconds % secondsInAWeek) % secondsInADay) / secondsInAnHour);
            const remainingMinutes = Math.floor((((seconds % secondsInAWeek) % secondsInADay) % secondsInAnHour) / secondsInAMinute);
            const remainingSeconds = Math.round((((seconds % secondsInAWeek) % secondsInADay) % secondsInAnHour) % secondsInAMinute);
            return `${weeks} tuần ${remainingDays} ngày ${remainingHours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`;
          } else {
            // Simplified for longer periods
            const days = Math.floor(seconds / secondsInADay);
            return `${days} ngày`;
          }
        }

        const currentTime = new Date();
        currentTime.setUTCHours(currentTime.getUTCHours() + 7);
        const timeDifference: number = currentTime.getTime() - anni.getTime();
        
        const cssText = `#loveYouUntilTheWorldEnd {
    time: ${convertMilliseconds(timeDifference)};
    day: ${convertMilliseconds(timeDifference, true)};
}`;

        await bot.sendMessage(
          `<pre><code class="language-css">${cssText}</code></pre>`,
          context.chatId,
          context.threadId
        );
      }
    },

    {
      name: '/all',
      description: 'Tag tất cả thành viên trong group',
      async execute(context: BotContext, args: string, bot: TelegramBot) {
        // This would need access to message entities to extract tagged users
        // For now, provide a simplified implementation
        
        if (args.trim()) {
          // User is setting new tags - would need full message parsing
          await bot.sendMessage(
            'Tính năng set tag đang được cập nhật!',
            context.chatId,
            context.threadId
          );
          return;
        }

        // Get existing tags
        const tagData = await db
          .collection('tag')
          .findOne({ filter: { id: context.chatId } });

        if (!tagData.document?.listtag) {
          await bot.sendMessage(
            'Chưa có danh sách tag nào! Sử dụng /all @user1 @user2 để set tag.',
            context.chatId,
            context.threadId
          );
          return;
        }

        let mentionText = 'Tất cả mọi người ơiiii!\n';
        tagData.document.listtag.forEach((item: any) => {
          if (item.subname) {
            mentionText += `<a href="tg://user?id=${item.tag}">${item.subname}</a>`;
          } else {
            mentionText += `@${item.tag}`;
          }
          mentionText += ' ';
        });

        await bot.sendMessage(mentionText, context.chatId, context.threadId);
      }
    }
  ];
}