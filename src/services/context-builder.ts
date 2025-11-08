/**
 * Context Builder Service
 * Builds AI context from database information
 */

import type { TelegramMessage } from '../types/telegram';
import type { DatabaseService } from './database';

const stickerMap = require('../stickers/sticker-map.json');

export class ContextBuilderService {
  constructor(private dbService: DatabaseService) {}

  async buildContext(message: TelegramMessage): Promise<string> {
    const userId = await this.dbService.getUserId(message.from?.id || 0);
    const groupId = message.chat.type === 'private' ? null : await this.dbService.getGroupId(message.chat.id);

    // Get all required data in parallel for better performance
    const [
      allUsers,
      recentMessages,
      currentDebts,
      aliases,
      confirmPrefs
    ] = await Promise.all([
      this.dbService.getAllUsers(),
      this.dbService.getRecentMessages(userId, groupId),
      this.dbService.getCurrentDebts(groupId),
      this.dbService.getNameAliases(userId),
      this.dbService.getConfirmationPreferences(userId)
    ]);

    // Build context string with complete user mapping
    const context = `
=== NGỮ CẢNH HIỆN TẠI ===
Current User: ${message.from?.first_name || ''} (Telegram ID: ${message.from?.id || 0}, Database ID: ${userId})
Chat: ${message.chat.type === 'private' ? 'Private' : message.chat.title}
Group ID: ${groupId}

=== TẤT CẢ USERS TRONG DATABASE ===
${allUsers.map(user => `DB ID: ${user.id} | Telegram ID: ${user.tgId} | Name: ${user.displayName || 'Unknown'} | Username: @${user.tgUsername || 'none'}`).join('\n')}

=== LỊCH SỬ CHAT GẦN ĐÂY ===
${recentMessages.map(msg => `${msg.sender}: ${msg.messageText}`).join('\n')}

=== NỢ HIỆN TẠI ===
${currentDebts.length > 0 ?
        currentDebts.map(debt => `DEBT ID ${debt.id}: Borrower DB ID ${debt.borrowerId} nợ Lender DB ID ${debt.lenderId}: ${debt.amount} ${debt.currency}${debt.note ? ` (${debt.note})` : ''}`).join('\n') :
        'Không có nợ nào.'
      }

=== TÊN GỌI ĐÃ HỌC ===
${aliases.length > 0 ?
        aliases.map(alias => `"${alias.aliasText}" -> DB User ID ${alias.refUserId}`).join('\n') :
        'Chưa có tên gọi nào được học.'
      }

=== CÀI ĐẶT XÁC NHẬN ===
${confirmPrefs.length > 0 ?
        confirmPrefs.map(pref => `With User ID ${pref.targetUserId}: Debt Creation=${pref.requireDebtCreation}, Payment=${pref.requireDebtPayment}, Deletion=${pref.requireDebtDeletion}, Completion=${pref.requireDebtCompletion}`).join('\n') :
        'Mặc định yêu cầu xác nhận cho tất cả hành động.'
      }

=== STICKER SYSTEM ===
Available stickers by category:
${Object.keys(stickerMap.emotions).map(emotion => `- ${emotion}: ${Object.keys(stickerMap.emotions[emotion]).length} stickers`).join('\n')}
${Object.keys(stickerMap.situations).map(situation => `- ${situation}: ${Object.keys(stickerMap.situations[situation]).length} stickers`).join('\n')}
- random: ${Object.keys(stickerMap.random).length} stickers

You can add "sticker" field with sticker ID to any message.
Use stickers sparingly for important moments only.

=== IMPORTANT: ALWAYS USE EXISTING DATABASE IDs ===
- When creating SQL, ONLY use the Database IDs listed above
- Current user database ID is: ${userId}
- Group database ID is: ${groupId}
- For DEBT operations (payments, debt updates): ONLY use the DEBT IDs listed in "NỢ HIỆN TẠI" section above
- DO NOT make up random IDs like 100, 101, etc.
- If no matching debt exists for payment operations, ask the user to clarify which specific debt they want to pay

=== AUTO DEBT CONSOLIDATION LOGIC ===
- When adding new debt, check if mutual debts exist between the same two users
- If User A owes User B 500k AND User B owes User A 400k, consolidate to: User A owes User B 100k
- Steps: 1) Mark old debts as settled (UPDATE debts SET settled = true), 2) Create new consolidated debt, 3) Log action
- Only consolidate if there are exactly two users with mutual debts

=== DEBT CONFIRMATION LOGIC ===
- Check confirmation_preferences table before requiring confirmations
- Users can disable confirmation for specific actions with specific people
- Commands like "mai mốt khỏi xác nhận khi tạo nợ cho anh nha mây" should update confirmation_preferences
- Only require confirmation if the preference setting is true for that action type
- Action types: debt_creation, debt_payment, debt_deletion, debt_completion
- If no preference exists, default to requiring confirmation
- Use pending_confirmations table to track confirmations when needed
    `.trim();

    return context;
  }
}