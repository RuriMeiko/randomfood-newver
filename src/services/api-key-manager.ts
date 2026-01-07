/**
 * API Key Manager - Handles rate limiting and key rotation
 * 
 * Features:
 * - Load keys from database using Drizzle ORM
 * - Automatic key rotation based on RPM/RPD limits
 * - Health tracking per key in database
 * - Uses PostgreSQL functions for atomic operations
 */

import { GoogleGenAI } from '@google/genai';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { apiKeys } from '../db/schema';
import type { ApiKey } from '../db/schema';

export class ApiKeyManager {
  private keys: ApiKey[] = [];
  private currentKeyIndex: number = 0;
  private db: ReturnType<typeof drizzle>;
  private sql: any;
  
  constructor(private databaseUrl: string) {
    console.log('🔑 [ApiKeyManager] Initializing with database backend');
  }

  /**
   * Initialize database connection and load keys
   */
  async initialize(): Promise<void> {
    // Initialize Drizzle
    this.sql = neon(this.databaseUrl);
    this.db = drizzle(this.sql);
    
    await this.loadKeysFromDatabase();
    console.log(`🔑 [ApiKeyManager] Loaded ${this.keys.length} API key(s) from database`);
  }

  /**
   * Load all active API keys from database using Drizzle
   */
  private async loadKeysFromDatabase(): Promise<void> {
    try {
      this.keys = await this.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.isActive, true))
        .orderBy(apiKeys.id);

      if (this.keys.length === 0) {
        throw new Error('No active API keys found in database. Please add keys to api_keys table.');
      }
    } catch (error) {
      console.error('❌ [ApiKeyManager] Failed to load keys from database:', error);
      throw error;
    }
  }

  /**
   * Refresh keys from database
   */
  async refreshKeys(): Promise<void> {
    await this.loadKeysFromDatabase();
  }

  /**
   * Get next available API key that hasn't exceeded limits
   */
  async getNextKey(): Promise<ApiKey | null> {
    const startIndex = this.currentKeyIndex;
    let attempts = 0;
    
    // Try to find an available key
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentKeyIndex];
      
      // Refresh key data from DB
      const freshKey = await this.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, key.id))
        .limit(1);
      
      if (freshKey.length > 0) {
        const updatedKey = freshKey[0];
        
        // Check if key is available
        if (this.isKeyAvailable(updatedKey)) {
          // Update local cache
          this.keys[this.currentKeyIndex] = updatedKey;
          
          console.log(`🔑 [ApiKeyManager] Using key: ${updatedKey.keyName} (RPM: ${updatedKey.requestsPerMinute}/${updatedKey.rpmLimit}, RPD: ${updatedKey.requestsPerDay}/${updatedKey.rpdLimit})`);
          return updatedKey;
        }
      }
      
      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      attempts++;
    }
    
    // All keys exhausted
    console.warn('⚠️ [ApiKeyManager] All keys exhausted or blocked');
    return null;
  }

  /**
   * Check if a key is available (local check)
   */
  private isKeyAvailable(key: ApiKey): boolean {
    // Check if blocked
    if (key.isBlocked) {
      if (key.blockedUntil && new Date(key.blockedUntil) > new Date()) {
        return false;
      }
      // Unblock if cooldown passed (will be updated in DB on next use)
    }
    
    // Check RPM limit
    if (key.requestsPerMinute >= key.rpmLimit) {
      return false;
    }
    
    // Check RPD limit
    if (key.requestsPerDay >= key.rpdLimit) {
      return false;
    }
    
    return true;
  }

  /**
   * Increment request count for a key using Drizzle
   */
  async incrementRequestCount(keyId: number): Promise<void> {
    try {
      // Get key name using Drizzle
      const keyResult = await this.db
        .select({ keyName: apiKeys.keyName })
        .from(apiKeys)
        .where(eq(apiKeys.id, keyId))
        .limit(1);
      
      if (keyResult.length === 0) {
        console.error(`❌ [ApiKeyManager] Key with id ${keyId} not found`);
        return;
      }
      
      const keyName = keyResult[0].keyName;
      
      // Use database function for atomic increment with auto-reset
      await this.sql`SELECT increment_request_count(${keyName})`;
      
      // Update only this key in local cache (no full refresh)
      await this.updateSingleKeyCache(keyId);
    } catch (error) {
      console.error(`❌ [ApiKeyManager] Error incrementing request count:`, error);
    }
  }

  /**
   * Mark key as successful using Drizzle
   */
  async reportSuccess(keyId: number): Promise<void> {
    try {
      await this.db
        .update(apiKeys)
        .set({
          failureCount: 0,
          isBlocked: false,
          blockedUntil: null,
          lastFailure: null,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, keyId));
      
      // Update only this key in local cache
      await this.updateSingleKeyCache(keyId);
      
      console.log(`✅ [ApiKeyManager] Key ${keyId} marked as successful`);
    } catch (error) {
      console.error(`❌ [ApiKeyManager] Error marking success:`, error);
    }
  }

  /**
   * Mark key as failed using Drizzle
   */
  async reportFailure(keyId: number, is429: boolean = false): Promise<void> {
    try {
      const key = this.keys.find(k => k.id === keyId);
      if (!key) return;
      
      const newFailureCount = key.failureCount + 1;
      
      // For 429 errors, don't block immediately - just increment failure count
      // Key will be temporarily skipped but can be retried after cooldown
      const shouldBlock = !is429 && newFailureCount >= 3;
      
      await this.db
        .update(apiKeys)
        .set({
          failureCount: newFailureCount,
          lastFailure: new Date(),
          isBlocked: shouldBlock,
          blockedUntil: shouldBlock ? new Date(Date.now() + 60000) : key.blockedUntil, // 1 min for non-429 errors
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, keyId));
      
      // Update only this key in local cache
      await this.updateSingleKeyCache(keyId);
      
      // Rotate to next key
      this.rotateKey();
      
      if (is429) {
        console.warn(`⚠️ [ApiKeyManager] Key ${key.keyName} hit 429 - will retry after cooldown (not blocked)`);
      } else {
        console.warn(`⚠️ [ApiKeyManager] Key ${key.keyName} marked as failed`);
      }
    } catch (error) {
      console.error(`❌ [ApiKeyManager] Error marking failure:`, error);
    }
  }

  /**
   * Update single key in cache (optimize: no full refresh)
   */
  private async updateSingleKeyCache(keyId: number): Promise<void> {
    try {
      const updated = await this.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, keyId))
        .limit(1);
      
      if (updated.length > 0) {
        const index = this.keys.findIndex(k => k.id === keyId);
        if (index >= 0) {
          this.keys[index] = updated[0];
        }
      }
    } catch (error) {
      console.error(`❌ [ApiKeyManager] Failed to update single key cache:`, error);
    }
  }

  /**
   * Rotate to next key
   */
  private rotateKey(): void {
    const oldIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    console.log(`🔄 [ApiKeyManager] Rotated key: ${oldIndex} → ${this.currentKeyIndex}`);
  }

  /**
   * Create GoogleGenAI client with next available key
   */
  async createClient(): Promise<{ client: GoogleGenAI; keyId: number } | null> {
    const key = await this.getNextKey();
    
    if (!key) {
      throw new Error('No available API keys. All keys exhausted or blocked.');
    }
    
    // Increment request count
    await this.incrementRequestCount(key.id);
    
    const client = new GoogleGenAI({ apiKey: key.apiKey });
    
    return {
      client: client,
      keyId: key.id
    };
  }

  /**
   * Execute with automatic retry and key rotation
   */
  async executeWithRetry<T>(
    operation: (client: GoogleGenAI) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const clientInfo = await this.createClient();
        
        if (!clientInfo) {
          throw new Error('No available API keys');
        }
        
        const { client, keyId } = clientInfo;
        const result = await operation(client);
        
        // Success! Report it
        await this.reportSuccess(keyId);
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a 429 error
        const is429 = this.is429Error(error);
        
        if (is429) {
          console.warn(`⚠️ [ApiKeyManager] Rate limit hit (attempt ${attempt + 1}/${maxRetries})`);
          
          // Report failure (will auto-rotate to next key, but not block it)
          const currentKey = this.keys[this.currentKeyIndex];
          if (currentKey) {
            await this.reportFailure(currentKey.id, true);
          }
          
          // Wait 10 seconds before retry (as requested)
          console.log(`⏳ [ApiKeyManager] Waiting 10s before retry...`);
          await this.sleep(10000);
          
          continue;
        }
        
        // Not a 429 error, throw immediately
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is a 429 rate limit error
   */
  private is429Error(error: any): boolean {
    const errorStr = error?.toString() || '';
    const message = error?.message || '';
    
    return (
      errorStr.includes('429') ||
      errorStr.includes('rate limit') ||
      errorStr.includes('quota exceeded') ||
      errorStr.includes('RESOURCE_EXHAUSTED') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota exceeded') ||
      message.includes('RESOURCE_EXHAUSTED')
    );
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get status of all keys
   */
  getStatus(): any {
    return {
      totalKeys: this.keys.length,
      currentKeyIndex: this.currentKeyIndex,
      keys: this.keys.map((key, index) => ({
        index: index,
        id: key.id,
        keyName: key.keyName,
        isActive: key.isActive,
        requestsPerMinute: key.requestsPerMinute,
        requestsPerDay: key.requestsPerDay,
        rpmLimit: key.rpmLimit,
        rpdLimit: key.rpdLimit,
        isBlocked: key.isBlocked,
        blockedUntil: key.blockedUntil ? new Date(key.blockedUntil).toISOString() : null,
      }))
    };
  }
}
