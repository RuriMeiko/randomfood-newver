import type NeonDB from '@/db/neon';
import type { BotMemory, NewBotMemory, BotMood, NewBotMood, DebtRecord, NewDebtRecord } from '@/db/schema';
import { log } from '@/utils/logger';

export interface MemoryContext {
  userMemory: BotMemory | null;
  currentMood: BotMood | null;
  relationshipLevel: string;
  trustLevel: number;
  recentEvents: string[];
}

export class BotMemoryService {
  private database: NeonDB;

  constructor(database: NeonDB) {
    this.database = database;
  }

  /**
   * Lấy memory context của user cho cuộc trò chuyện
   */
  async getMemoryContext(chatId: string, userId: string): Promise<MemoryContext> {
    try {
      // Lấy memory của user
      const userMemory = await this.getUserMemory(chatId, userId);
      
      // Lấy tâm trạng hiện tại của bot trong chat này
      const currentMood = await this.getCurrentMood(chatId);
      
      // Lấy các sự kiện gần đây
      const recentEvents = await this.getRecentEvents(chatId, userId);

      return {
        userMemory,
        currentMood,
        relationshipLevel: userMemory?.relationshipLevel || 'stranger',
        trustLevel: userMemory?.trustLevel || 50,
        recentEvents
      };
    } catch (error: any) {
      log.error('Error getting memory context', error, { chatId, userId });
      return {
        userMemory: null,
        currentMood: null,
        relationshipLevel: 'stranger',
        trustLevel: 50,
        recentEvents: []
      };
    }
  }

  /**
   * Cập nhật memory về user từ cuộc trò chuyện
   */
  async updateUserMemory(
    chatId: string, 
    userId: string, 
    userName: string,
    newInfo: Partial<BotMemory>
  ): Promise<void> {
    try {
      const existingMemory = await this.getUserMemory(chatId, userId);
      
      if (existingMemory) {
        // Update existing memory
        await this.database.query(
          `UPDATE bot_memories SET 
           user_name = COALESCE($3, user_name),
           nick_name = COALESCE($4, nick_name),
           personal_info = COALESCE($5, personal_info),
           relationship_level = COALESCE($6, relationship_level),
           important_events = COALESCE($7, important_events),
           preferences = COALESCE($8, preferences),
           trust_level = COALESCE($9, trust_level),
           interaction_count = interaction_count + 1,
           last_interaction = NOW(),
           updated_at = NOW()
           WHERE chat_id = $1 AND user_id = $2`,
          [
            chatId, userId, newInfo.userName, newInfo.nickName,
            newInfo.personalInfo, newInfo.relationshipLevel,
            newInfo.importantEvents, newInfo.preferences, newInfo.trustLevel
          ]
        );
      } else {
        // Create new memory
        const newMemory: NewBotMemory = {
          chatId,
          userId,
          userName,
          nickName: newInfo.nickName,
          personalInfo: newInfo.personalInfo,
          relationshipLevel: newInfo.relationshipLevel || 'stranger',
          importantEvents: newInfo.importantEvents,
          preferences: newInfo.preferences,
          trustLevel: newInfo.trustLevel || 50,
          interactionCount: 1
        };

        await this.database.query(
          `INSERT INTO bot_memories (
            chat_id, user_id, user_name, nick_name, personal_info, 
            relationship_level, important_events, preferences, trust_level, interaction_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newMemory.chatId, newMemory.userId, newMemory.userName,
            newMemory.nickName, newMemory.personalInfo, newMemory.relationshipLevel,
            newMemory.importantEvents, newMemory.preferences, newMemory.trustLevel,
            newMemory.interactionCount
          ]
        );
      }

      log.info('User memory updated', { chatId, userId, userName });
    } catch (error: any) {
      log.error('Error updating user memory', error, { chatId, userId });
    }
  }

  /**
   * Cập nhật tâm trạng bot dựa trên cuộc trò chuyện hoặc ngẫu nhiên
   */
  async updateBotMood(
    chatId: string,
    trigger: 'user_interaction' | 'random_event' | 'memory_trigger',
    reason?: string,
    moodData?: Partial<BotMood>
  ): Promise<BotMood> {
    try {
      // Tạo tâm trạng mới
      const moods = ['happy', 'playful', 'excited', 'neutral', 'tired', 'grumpy', 'sad', 'angry', 'confused', 'silly'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      
      const newMood: NewBotMood = {
        chatId,
        currentMood: moodData?.currentMood || randomMood,
        moodLevel: moodData?.moodLevel || Math.floor(Math.random() * 50) + 25, // 25-75
        moodReason: reason || 'Random mood change',
        moodTrigger: trigger,
        responseStyle: this.getMoodResponseStyle(moodData?.currentMood || randomMood),
        moodDuration: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
        isActive: true
      };

      // Deactivate old moods
      await this.database.query(
        'UPDATE bot_moods SET is_active = false WHERE chat_id = $1 AND is_active = true',
        [chatId]
      );

      // Insert new mood
      await this.database.query(
        `INSERT INTO bot_moods (
          chat_id, current_mood, mood_level, mood_reason, mood_trigger, 
          response_style, mood_duration, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newMood.chatId, newMood.currentMood, newMood.moodLevel,
          newMood.moodReason, newMood.moodTrigger, newMood.responseStyle,
          newMood.moodDuration, newMood.isActive
        ]
      );

      log.info('Bot mood updated', { 
        chatId, 
        mood: newMood.currentMood, 
        level: newMood.moodLevel,
        trigger,
        reason 
      });

      return newMood as BotMood;
    } catch (error: any) {
      log.error('Error updating bot mood', error, { chatId });
      throw error;
    }
  }

  /**
   * Lấy style response dựa trên tâm trạng
   */
  private getMoodResponseStyle(mood: string): string {
    const moodStyles: Record<string, string> = {
      'happy': 'long',
      'playful': 'playful', 
      'excited': 'long',
      'neutral': 'normal',
      'tired': 'short',
      'grumpy': 'short',
      'sad': 'minimal',
      'angry': 'minimal',
      'confused': 'short',
      'silly': 'playful'
    };
    
    return moodStyles[mood] || 'normal';
  }

  /**
   * Lấy memory của user
   */
  private async getUserMemory(chatId: string, userId: string): Promise<BotMemory | null> {
    try {
      const memories = await this.database.query(
        'SELECT * FROM bot_memories WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      ) as BotMemory[];

      return memories[0] || null;
    } catch (error: any) {
      log.error('Error getting user memory', error, { chatId, userId });
      return null;
    }
  }

  /**
   * Lấy tâm trạng hiện tại
   */
  private async getCurrentMood(chatId: string): Promise<BotMood | null> {
    try {
      const moods = await this.database.query(
        `SELECT * FROM bot_moods 
         WHERE chat_id = $1 AND is_active = true 
         AND last_mood_change > NOW() - INTERVAL '1 hour' * mood_duration / 60
         ORDER BY last_mood_change DESC LIMIT 1`,
        [chatId]
      ) as BotMood[];

      return moods[0] || null;
    } catch (error: any) {
      log.error('Error getting current mood', error, { chatId });
      return null;
    }
  }

  /**
   * Lấy các sự kiện gần đây
   */
  private async getRecentEvents(chatId: string, userId: string): Promise<string[]> {
    try {
      // Lấy từ conversation messages gần đây
      const recentMessages = await this.database.query(
        `SELECT content FROM conversation_messages 
         WHERE chat_id = $1 AND (user_id = $2 OR message_type = 'bot')
         ORDER BY timestamp DESC LIMIT 10`,
        [chatId, userId]
      );

      return recentMessages.map((msg: any) => msg.content).slice(0, 5);
    } catch (error: any) {
      log.error('Error getting recent events', error, { chatId, userId });
      return [];
    }
  }

  /**
   * Lưu debt record chính xác
   */
  async createDebtRecord(debtInfo: NewDebtRecord): Promise<DebtRecord | null> {
    try {
      await this.database.query(
        `INSERT INTO debt_records (
          chat_id, debtor_user_id, debtor_name, creditor_user_id, creditor_name,
          amount, currency, description, ai_confidence, witnesses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          debtInfo.chatId, debtInfo.debtorUserId, debtInfo.debtorName,
          debtInfo.creditorUserId, debtInfo.creditorName, debtInfo.amount,
          debtInfo.currency, debtInfo.description, debtInfo.aiConfidence,
          debtInfo.witnesses
        ]
      );

      log.info('Debt record created', { 
        chatId: debtInfo.chatId,
        debtor: debtInfo.debtorName,
        creditor: debtInfo.creditorName,
        amount: debtInfo.amount
      });

      return debtInfo as DebtRecord;
    } catch (error: any) {
      log.error('Error creating debt record', error, { debtInfo });
      return null;
    }
  }
}