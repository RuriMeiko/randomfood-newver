/**
 * Database Service
 * Handles all database operations and SQL execution
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  tgUsers,
  tgGroups,
  debts,
  nameAliases,
  chatMessages,
  actionLogs,
  pendingConfirmations,
  confirmationPreferences,
  payments
} from '../db/schema';
import type { TelegramMessage } from '../types/telegram';
import type { SQLExecutionContext, ActionLogData, ActionType, DebtInfo } from '../types/ai-bot';

export class DatabaseService {
  private db: ReturnType<typeof drizzle>;
  private sql: any;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
    this.db = drizzle(this.sql);
  }

  async ensureUserAndGroup(message: TelegramMessage) {
    // Ensure user exists
    const existingUser = await this.db
      .select()
      .from(tgUsers)
      .where(eq(tgUsers.tgId, message.from?.id || 0))
      .limit(1);

    if (existingUser.length === 0) {
      await this.db.insert(tgUsers).values({
        tgId: message.from?.id || 0,
        tgUsername: message.from?.username || '',
        displayName: `${message.from?.first_name || ''} ${message.from?.last_name || ''}`.trim(),
      });
    }

    // Ensure group exists (if not private chat)
    if (message.chat.type !== 'private') {
      const existingGroup = await this.db
        .select()
        .from(tgGroups)
        .where(eq(tgGroups.tgChatId, message.chat.id))
        .limit(1);

      if (existingGroup.length === 0) {
        const chatType = message.chat.type === 'channel' ? 'group' : message.chat.type as 'private' | 'group' | 'supergroup';
        await this.db.insert(tgGroups).values({
          tgChatId: message.chat.id,
          title: message.chat.title || 'Unknown Group',
          type: chatType,
        });
      }
    }
  }

  async getUserId(tgId: number): Promise<number> {
    const user = await this.db
      .select({ id: tgUsers.id })
      .from(tgUsers)
      .where(eq(tgUsers.tgId, tgId))
      .limit(1);
    
    return user[0]?.id || 0;
  }

  async getGroupId(tgChatId: number): Promise<number | null> {
    const group = await this.db
      .select({ id: tgGroups.id })
      .from(tgGroups)
      .where(eq(tgGroups.tgChatId, tgChatId))
      .limit(1);
    
    return group[0]?.id || null;
  }

  async getAllUsers() {
    return await this.db
      .select({
        id: tgUsers.id,
        tgId: tgUsers.tgId,
        displayName: tgUsers.displayName,
        tgUsername: tgUsers.tgUsername,
      })
      .from(tgUsers)
      .limit(50);
  }

  async getRecentMessages(chatId: number) {
    return await this.db
      .select({
        sender: chatMessages.sender,
        messageText: chatMessages.messageText,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.chatId, chatId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(10);
  }


  /**
   * Get recent messages from a specific chat ID (all users + AI messages)
   * @param chatId - Telegram chat ID 
   * @returns 10 most recent messages with sender info
   */
  async getRecentMessagesByChatId(chatId: number) {
    try {
      console.log(`🔍 Getting recent messages for chatId: ${chatId}`);

      const messages = await this.db
        .select({
          sender: chatMessages.sender,
          senderTgId: chatMessages.senderTgId,
          messageText: chatMessages.messageText,
          createdAt: chatMessages.createdAt,
          senderDisplayName: tgUsers.displayName,
          senderUsername: tgUsers.tgUsername,
        })
        .from(chatMessages)
        .leftJoin(tgUsers, eq(chatMessages.senderTgId, tgUsers.tgId))
        .where(eq(chatMessages.chatId, chatId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(10);

      console.log(`📝 Found ${messages.length} recent messages for chat ${chatId}`);
      
      // Format messages for better readability
      return messages.map(msg => ({
        sender: msg.sender,
        senderName: msg.sender === 'ai' ? 'Mây (AI)' : (msg.senderDisplayName || msg.senderUsername || `User ${msg.senderTgId}`),
        messageText: msg.messageText,
        createdAt: msg.createdAt,
        isAI: msg.sender === 'ai'
      }));

    } catch (error) {
      console.error('❌ Error getting recent messages by chat ID:', error);
      return [];
    }
  }

  async getCurrentDebts(groupId: number | null) {
    return await this.db
      .select({
        id: debts.id,
        amount: debts.amount,
        currency: debts.currency,
        note: debts.note,
        occurredAt: debts.occurredAt,
        lenderId: debts.lenderId,
        borrowerId: debts.borrowerId,
      })
      .from(debts)
      .where(
        and(
          eq(debts.settled, false),
          groupId ? eq(debts.groupId, groupId) : sql`${debts.groupId} IS NULL`
        )
      )
      .limit(20);
  }

  async getNameAliases(userId: number) {
    return await this.db
      .select({
        aliasText: nameAliases.aliasText,
        refUserId: nameAliases.refUserId,
      })
      .from(nameAliases)
      .where(eq(nameAliases.ownerUserId, userId))
      .limit(50);
  }

  async getConfirmationPreferences(userId: number) {
    return await this.db
      .select({
        targetUserId: confirmationPreferences.targetUserId,
        requireDebtCreation: confirmationPreferences.requireDebtCreation,
        requireDebtPayment: confirmationPreferences.requireDebtPayment,
        requireDebtDeletion: confirmationPreferences.requireDebtDeletion,
        requireDebtCompletion: confirmationPreferences.requireDebtCompletion,
      })
      .from(confirmationPreferences)
      .where(eq(confirmationPreferences.userId, userId))
      .limit(50);
  }

  async executeSqlQuery(query: string, params: any, context?: SQLExecutionContext) {
    try {
      // Only allow safe SELECT, INSERT, UPDATE queries
      const safeQuery = query.toLowerCase().trim();
      if (!safeQuery.startsWith('select') &&
        !safeQuery.startsWith('insert') &&
        !safeQuery.startsWith('update')) {
        throw new Error('Unsafe SQL query');
      }

      // Special validation for payments with debt_id
      if (safeQuery.includes('insert into payments') && params && params.length > 0) {
        const debtId = params[0];
        if (debtId) {
          const debtExists = await this.sql.query(
            'SELECT id FROM debts WHERE id = $1 AND settled = false',
            [debtId]
          );

          if (!debtExists || debtExists.length === 0) {
            throw new Error(`Debt ID ${debtId} does not exist or is already settled`);
          }
        }
      }

      console.log('Executing SQL:', query, params);
      const result = await this.sql.query(query, params);
      console.log('✅ SQL executed successfully:', result);

      // Log action (only for INSERT and UPDATE, not SELECT)
      if (!safeQuery.startsWith('select') && context) {
        await this.logAction({
          userId: context.userId,
          groupId: context.groupId,
          actionType: this.determineActionType(query),
          payload: {
            query: query,
            params: params,
            result: result,
            reason: context.reason,
            userMessage: context.userMessage,
            executedAt: new Date().toISOString()
          }
        });
      }

      return result;

    } catch (error: any) {
      console.error('❌ SQL execution error:', error);

      // Log failed action
      if (context) {
        await this.logAction({
          userId: context.userId,
          groupId: context.groupId,
          actionType: 'sql_error',
          payload: {
            query: query,
            params: params,
            error: error.message,
            reason: context.reason,
            userMessage: context.userMessage,
            executedAt: new Date().toISOString()
          }
        });
      }

      throw error;
    }
  }

  async logAction(actionData: ActionLogData) {
    try {
      if (actionData.userId) {
        await this.db.insert(actionLogs).values({
          userId: actionData.userId,
          groupId: actionData.groupId,
          actionType: actionData.actionType,
          payload: JSON.stringify(actionData.payload),
        });
      }
    } catch (error) {
      console.error('❌ Failed to log action:', error);
      // Don't throw here to avoid breaking the main flow
    }
  }

  async saveConversation(message: TelegramMessage, aiResponse: any) {
    try {
      const chatId = message.chat.id;

      // Save user message
      await this.db.insert(chatMessages).values({
        chatId,
        sender: 'user',
        senderTgId: message.from?.id || 0,
        messageText: message.text || '',
        intent: aiResponse?.intent || 'unknown',
        sqlQuery: aiResponse?.sqlQuery || null,
        sqlParams: aiResponse?.sqlParams ? JSON.stringify(aiResponse.sqlParams) : null,
      } as any);

      // Save AI response messages
      if (aiResponse?.messages && Array.isArray(aiResponse.messages)) {
        for (const aiMsg of aiResponse.messages) {
          await this.db.insert(chatMessages).values({
            chatId,
            sender: 'ai',
            senderTgId: null, // AI doesn't have a Telegram ID
            messageText: aiMsg.text || '',
            delayMs: parseInt(aiMsg.delay) || null,
            intent: aiResponse.intent || 'unknown',
            sqlQuery: aiResponse?.sqlQuery || null,
            sqlParams: aiResponse?.sqlParams ? JSON.stringify(aiResponse.sqlParams) : null,
          } as any);
        }
        console.log(`💾 Saved user message + ${aiResponse.messages.length} AI messages to chat history`);
      }

    } catch (error) {
      console.error('❌ Failed to save conversation:', error);
    }
  }


  private determineActionType(query: string): ActionType {
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.includes('insert into debts')) return 'debt_created';
    if (lowerQuery.includes('update debts') && lowerQuery.includes('settled = true')) return 'debt_settled';
    if (lowerQuery.includes('insert into payments')) return 'payment_created';
    if (lowerQuery.includes('insert into confirmation_preferences')) return 'confirmation_preference_created';
    if (lowerQuery.includes('update confirmation_preferences')) return 'confirmation_preference_updated';
    if (lowerQuery.includes('insert into name_aliases')) return 'name_alias_created';

    return 'sql_error'; // fallback
  }
}