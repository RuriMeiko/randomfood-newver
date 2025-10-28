import type NeonDB from '@/db/neon';
import type { FoodItem, HistoryItem } from '@/commands/types';
import { log } from '@/utils/logger';

export class FoodService {
  constructor(private db: NeonDB) {}

  async getRandomFood(): Promise<FoodItem> {
    try {
      log.db.query('aggregate', 'mainfood', { operation: 'random_sample' });
      
      const result = await this.db
        .collection('mainfood')
        .aggregate({ pipeline: [{ $sample: { size: 1 } }] });
      
      log.debug('Random food selected', { foodId: result.documents[0]?.id, foodName: result.documents[0]?.name });
      return result.documents[0];
    } catch (error: any) {
      log.db.error('aggregate', 'mainfood', error);
      throw error;
    }
  }

  async getRandomSubFood(): Promise<FoodItem> {
    const result = await this.db
      .collection('subfood')
      .aggregate({ pipeline: [{ $sample: { size: 1 } }] });
    
    return result.documents[0];
  }

  async getFoodById(id: number): Promise<FoodItem | null> {
    const result = await this.db
      .collection('mainfood')
      .findOne({ filter: { id } });
    
    return result.document;
  }

  async getSubFoodById(id: number): Promise<FoodItem | null> {
    const result = await this.db
      .collection('subfood')
      .findOne({ filter: { id } });
    
    return result.document;
  }

  async hasRandomizedToday(userId: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      log.db.query('find', 'historyfood', { userId, operation: 'check_today' });
      
      const result = await this.db
        .collection('historyfood')
        .find({
          filter: {
            userid: userId,
            randomAt: { $gte: today }
          }
        });
      
      const hasRandomized = result.documents.length > 0;
      log.debug('Checked daily randomization status', { userId, hasRandomized });
      
      return hasRandomized;
    } catch (error: any) {
      log.db.error('find', 'historyfood', error, { userId });
      throw error;
    }
  }

  async getLastRandomFood(userId: string): Promise<HistoryItem | null> {
    const result = await this.db
      .collection('historyfood')
      .find({
        filter: { userid: userId },
        sort: { randomAt: -1 },
        limit: 1
      });
    
    return result.documents[0] || null;
  }

  async saveRandomHistory(userId: string, foodId: number, subFoodId?: number): Promise<void> {
    try {
      const historyData = {
        userid: userId,
        food: foodId,
        subfood: subFoodId || null,
        randomAt: new Date()
      };

      log.db.query('insertOne', 'historyfood', { userId, foodId, subFoodId });
      log.user.action('food_randomized', userId, { foodId, subFoodId });
      
      await this.db.collection('historyfood').insertOne(historyData);
      
      log.info('Food history saved', { userId, foodId, subFoodId });
    } catch (error: any) {
      log.db.error('insertOne', 'historyfood', error, { userId, foodId, subFoodId });
      throw error;
    }
  }

  async getFoodHistory(userId: string, limit: number = 10, offset: number = 0): Promise<HistoryItem[]> {
    const result = await this.db
      .collection('historyfood')
      .find({
        filter: { userid: userId },
        sort: { randomAt: -1 },
        limit,
        skip: offset
      });
    
    return result.documents;
  }

  makeSearchUrl(foodName: string): string {
    return `https://www.google.com/search?q=Cách làm ${encodeURIComponent(foodName)}`;
  }
}