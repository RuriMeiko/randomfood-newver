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

  /**
   * Get group members (users who have sent messages in this chat)
   */
  async getGroupMembers(chatId: number): Promise<any[]> {
    try {
      const members = await this.db
        .selectDistinct({
          tgId: tgUsers.tgId,
          displayName: tgUsers.displayName,
          tgUsername: tgUsers.tgUsername,
        })
        .from(chatMessages)
        .innerJoin(tgUsers, eq(chatMessages.senderTgId, tgUsers.tgId))
        .where(
          and(
            eq(chatMessages.chatId, chatId),
            eq(chatMessages.sender, 'user')
          )
        )
        .limit(50);

      return members;
    } catch (error) {
      console.error('❌ Error getting group members:', error);
      return [];
    }
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
   * Get a specific message by telegram_message_id
   */
  async getMessageByTelegramId(chatId: number, telegramMessageId: number) {
    try {
      const message = await this.db
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
        .where(
          and(
            eq(chatMessages.chatId, chatId),
            eq(chatMessages.telegramMessageId, telegramMessageId)
          )
        )
        .limit(1);

      if (message.length > 0) {
        const msg = message[0];
        return {
          sender: msg.sender,
          senderName: msg.sender === 'ai' ? 'Mây (AI)' : (msg.senderDisplayName || msg.senderUsername || `User ${msg.senderTgId}`),
          messageText: msg.messageText,
          createdAt: msg.createdAt,
          isAI: msg.sender === 'ai'
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting message by telegram ID:', error);
      return null;
    }
  }

  /**
   * Get recent messages from a specific chat ID (all users + AI messages)
   * @param chatId - Telegram chat ID 
   * @returns 50 most recent messages with sender info
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
        .limit(50);

      console.log(`📝 Found ${messages.length} recent messages for chat ${chatId}`);
      
      // Format messages for better readability - reverse order to show oldest first
      return messages.reverse().map(msg => ({
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

  /**
   * Get all chats where a specific user has participated
   * @param userTgId - Telegram user ID
   * @returns Array of chat IDs with metadata
   */
  async getUserChats(userTgId: number) {
    try {
      console.log(`🔍 Getting all chats for user TG ID: ${userTgId}`);

      // Get distinct chat IDs where user has sent messages
      const userChats = await this.db
        .select({
          chatId: chatMessages.chatId,
          lastMessageAt: sql<Date>`MAX(${chatMessages.createdAt})`.as('last_message_at'),
          messageCount: sql<number>`COUNT(*)`.as('message_count'),
        })
        .from(chatMessages)
        .where(eq(chatMessages.senderTgId, userTgId))
        .groupBy(chatMessages.chatId)
        .orderBy(desc(sql`MAX(${chatMessages.createdAt})`));

      console.log(`📝 Found ${userChats.length} chats for user ${userTgId}`);
      
      return userChats;

    } catch (error) {
      console.error('❌ Error getting user chats:', error);
      return [];
    }
  }

  /**
   * Get chat metadata (name, type) for a chat ID
   * @param chatId - Telegram chat ID
   * @returns Chat metadata
   */
  async getChatMetadata(chatId: number) {
    try {
      // Try to find in groups table first
      const group = await this.db
        .select({
          chatId: tgGroups.tgChatId,
          chatName: tgGroups.title,
          chatType: sql<string>`'group'`.as('chat_type'),
        })
        .from(tgGroups)
        .where(eq(tgGroups.tgChatId, chatId))
        .limit(1);

      if (group.length > 0) {
        return group[0];
      }

      // If not found in groups, it's a private chat
      // Try to get user info from messages
      const privateChat = await this.db
        .select({
          chatId: chatMessages.chatId,
          chatName: tgUsers.displayName,
          chatType: sql<string>`'private'`.as('chat_type'),
        })
        .from(chatMessages)
        .leftJoin(tgUsers, eq(chatMessages.senderTgId, tgUsers.tgId))
        .where(and(
          eq(chatMessages.chatId, chatId),
          sql`${chatMessages.sender} = 'user'`
        ))
        .limit(1);

      if (privateChat.length > 0) {
        return privateChat[0];
      }

      return {
        chatId,
        chatName: `Chat ${chatId}`,
        chatType: 'unknown'
      };

    } catch (error) {
      console.error('❌ Error getting chat metadata:', error);
      return {
        chatId,
        chatName: `Chat ${chatId}`,
        chatType: 'unknown'
      };
    }
  }

  /**
   * Get recent messages from multiple chats (for cross-chat context)
   * @param chatIds - Array of chat IDs
   * @param limit - Number of messages per chat (default 25)
   * @returns Object mapping chatId to messages
   */
  async getRecentMessagesFromChats(chatIds: number[], limit: number = 25) {
    try {
      console.log(`🔍 Getting recent messages from ${chatIds.length} chats (${limit} per chat)`);

      const result: { [chatId: number]: any[] } = {};

      for (const chatId of chatIds) {
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
          .limit(limit);

        result[chatId] = messages.reverse().map(msg => ({
          sender: msg.sender,
          senderName: msg.sender === 'ai' ? 'Mây (AI)' : (msg.senderDisplayName || msg.senderUsername || `User ${msg.senderTgId}`),
          messageText: msg.messageText,
          createdAt: msg.createdAt,
          isAI: msg.sender === 'ai'
        }));
      }

      console.log(`📝 Retrieved messages from ${Object.keys(result).length} chats`);
      return result;

    } catch (error) {
      console.error('❌ Error getting messages from multiple chats:', error);
      return {};
    }
  }

  /**
   * Save a user message to the database immediately (without AI response)
   * @param message - Telegram message
   */
  async saveUserMessage(message: TelegramMessage) {
    try {
      const chatId = message.chat.id;
      
      await this.db.insert(chatMessages).values({
        chatId,
        sender: 'user',
        senderTgId: message.from?.id || 0,
        messageText: message.text || '',
        telegramMessageId: message.message_id,
        replyToMessageId: message.reply_to_message?.message_id || null,
        intent: null,
        sqlQuery: null,
        sqlParams: null,
      } as any);

      console.log(`💾 Saved user message to chat history (chatId: ${chatId}, msgId: ${message.message_id})`);
    } catch (error) {
      console.error('❌ Failed to save user message:', error);
    }
  }

  /**
   * Save user location from Telegram location message
   * @param message - Telegram message with location
   */
  async saveUserLocation(message: TelegramMessage) {
    try {
      if (!message.location || !message.from?.id) {
        console.warn('⚠️ No location data or user ID in message');
        return;
      }

      const { latitude, longitude } = message.location;
      
      await this.executeSqlQuery(
        `UPDATE tg_users 
         SET latitude = $1, 
             longitude = $2,
             location_updated_at = NOW()
         WHERE tg_id = $3`,
        [latitude.toString(), longitude.toString(), message.from.id.toString()],
        { reason: 'Save user location from Telegram', userMessage: 'Location shared' }
      );

      console.log(`📍 Saved location for user ${message.from.id}: (${latitude}, ${longitude})`);
    } catch (error) {
      console.error('❌ Failed to save user location:', error);
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

      // console.log('Executing SQL:', query, params);
      const result = await this.sql.query(query, params);
      // console.log('✅ SQL executed successfully:', result);

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
    // Action logging disabled - table removed from schema
    // Keep function for backward compatibility
    return;
  }

  async saveConversation(message: TelegramMessage, aiResponse: any) {
    try {
      const chatId = message.chat.id;

      // Note: User message is already saved in index.ts, so we only save AI responses here
      
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
        console.log(`💾 Saved ${aiResponse.messages.length} AI messages to chat history`);
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

  // ==========================================
  // TOOL METHODS FOR AUTONOMOUS AI AGENT
  // ==========================================

  /**
   * Tool: inspect_schema
   * Returns all tables and their columns from information_schema
   */
  async inspectSchema(): Promise<string> {
    try {
      const query = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `;

      const result = await this.sql.query(query);
      
      // Group by table
      const tables: Record<string, any[]> = {};
      for (const row of result) {
        if (!tables[row.table_name]) {
          tables[row.table_name] = [];
        }
        tables[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable,
          default: row.column_default
        });
      }

      return JSON.stringify({ tables }, null, 2);
    } catch (error: any) {
      console.error('❌ Error inspecting schema:', error);
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }

  /**
   * Tool: describe_table
   * Returns detailed information about a specific table
   */
  async describeTable(tableName: string): Promise<string> {
    try {
      // Get column information
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `;

      // Get foreign key information
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY';
      `;

      const [columns, foreignKeys] = await Promise.all([
        this.sql.query(columnsQuery, [tableName]),
        this.sql.query(fkQuery, [tableName])
      ]);

      return JSON.stringify({
        table: tableName,
        columns,
        foreignKeys
      }, null, 2);
    } catch (error: any) {
      console.error('❌ Error describing table:', error);
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }

  /**
   * Tool: list_tables
   * Returns a simple list of all table names
   */
  async listTables(): Promise<string> {
    try {
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      const result = await this.sql.query(query);
      const tables = result.map((row: any) => row.table_name);

      return JSON.stringify({ tables }, null, 2);
    } catch (error: any) {
      console.error('❌ Error listing tables:', error);
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }

  /**
   * Tool: execute_sql (tool-compatible version)
   * Executes SQL and returns results in tool format
   */
  async executeToolSql(query: string, params: any[], context?: SQLExecutionContext): Promise<any> {
    try {
      // Only allow safe SELECT, INSERT, UPDATE queries
      const safeQuery = query.toLowerCase().trim();
      // if (!safeQuery.startsWith('select') &&
      //   !safeQuery.startsWith('insert') &&
      //   !safeQuery.startsWith('update')) {
      //   throw new Error('Unsafe SQL query - only SELECT, INSERT, UPDATE allowed');
      // }

      console.log('🔧 [Tool] Executing SQL:', query, params);
      const result = await this.sql.query(query, params);
      console.log('✅ [Tool] SQL executed successfully');

      // Log action (only for INSERT and UPDATE, not SELECT)
      if (!safeQuery.startsWith('select') && context) {
        await this.logAction({
          userId: context.userId,
          groupId: context.groupId,
          actionType: this.determineActionType(query),
          payload: {
            query,
            params,
            result,
            reason: context.reason,
            userMessage: context.userMessage,
            executedAt: new Date().toISOString(),
            executedViaTool: true
          }
        });
      }

      return {
        rows: result,
        rowCount: result.length,
        query,
        params
      };

    } catch (error: any) {
      console.error('❌ [Tool] SQL execution error:', error);

      // Log failed action
      if (context) {
        await this.logAction({
          userId: context.userId,
          groupId: context.groupId,
          actionType: 'sql_error',
          payload: {
            query,
            params,
            error: error.message,
            reason: context.reason,
            userMessage: context.userMessage,
            executedAt: new Date().toISOString(),
            executedViaTool: true
          }
        });
      }

      throw error;
    }
  }
}