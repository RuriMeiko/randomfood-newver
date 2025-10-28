import type NeonDB from '@/db/neon';
import type { FoodItem, HistoryItem } from '@/commands/types';

export class FoodService {
  constructor(private db: NeonDB) {}

  async getRandomFood(): Promise<FoodItem> {
    const result = await this.db
      .collection('mainfood')
      .aggregate({ pipeline: [{ $sample: { size: 1 } }] });
    
    return result.documents[0];
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
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const result = await this.db
      .collection('historyfood')
      .find({
        filter: {
          userid: userId,
          randomAt: { $gte: today }
        }
      });
    
    return result.documents.length > 0;
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
    const historyData = {
      userid: userId,
      food: foodId,
      subfood: subFoodId || null,
      randomAt: new Date()
    };

    await this.db.collection('historyfood').insertOne(historyData);
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