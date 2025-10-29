import type NeonDB from '@/db/neon';
import type { FoodSuggestion, NewFoodSuggestion } from '@/db/schema';
import { GeminiService } from './gemini.service';
import { log } from '@/utils/logger';

export class SimpleFoodService {
  private database: NeonDB;
  private geminiService: GeminiService;

  constructor(database: NeonDB, geminiApiKey: string) {
    this.database = database;
    this.geminiService = new GeminiService(geminiApiKey);
  }

  /**
   * Get random food suggestion using Gemini AI
   */
  async getRandomFoodSuggestion(userId: string, chatId: string, userPrompt?: string): Promise<{
    success: boolean;
    suggestion?: string;
    error?: string;
  }> {
    try {
      // Generate suggestion using Gemini
      const geminiResponse = await this.geminiService.generateFoodSuggestion(userPrompt);
      
      if (!geminiResponse.success) {
        return {
          success: false,
          error: geminiResponse.error || 'Failed to generate suggestion'
        };
      }

      // Save to history
      await this.saveSuggestionHistory(userId, chatId, geminiResponse.suggestion, userPrompt);

      log.user.action('food_suggested', userId, {
        chatId,
        hasPrompt: !!userPrompt,
        suggestionLength: geminiResponse.suggestion.length
      });

      return {
        success: true,
        suggestion: geminiResponse.suggestion
      };

    } catch (error: any) {
      log.error('Error getting food suggestion', error, { userId, chatId });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save suggestion to history
   */
  async saveSuggestionHistory(userId: string, chatId: string, suggestion: string, prompt?: string): Promise<void> {
    try {
      const newSuggestion: NewFoodSuggestion = {
        userId,
        chatId,
        suggestion,
        prompt: prompt || null,
      };

      await this.database.query(
        'INSERT INTO food_suggestions (user_id, chat_id, suggestion, prompt) VALUES ($1, $2, $3, $4)',
        [userId, chatId, suggestion, prompt || null]
      );

      log.database.success('Food suggestion saved to history', { userId, chatId });
    } catch (error: any) {
      log.error('Error saving suggestion history', error, { userId, chatId });
      // Don't throw - history saving failure shouldn't break the main function
    }
  }

  /**
   * Get user's suggestion history
   */
  async getUserHistory(userId: string, limit: number = 10): Promise<FoodSuggestion[]> {
    try {
      const history = await this.database.query(
        'SELECT * FROM food_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      ) as FoodSuggestion[];

      log.database.success('Retrieved user history', { userId, count: history.length });
      return history;
    } catch (error: any) {
      log.error('Error getting user history', error, { userId });
      return [];
    }
  }

  /**
   * Get total suggestions count for user
   */
  async getUserSuggestionsCount(userId: string): Promise<number> {
    try {
      const result = await this.database.query(
        'SELECT COUNT(*) as count FROM food_suggestions WHERE user_id = $1',
        [userId]
      );
      
      return parseInt(result[0]?.count || '0');
    } catch (error: any) {
      log.error('Error getting user suggestions count', error, { userId });
      return 0;
    }
  }
}