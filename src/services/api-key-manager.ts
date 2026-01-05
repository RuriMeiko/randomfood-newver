/**
 * API Key Manager - Handles rate limiting and key rotation
 * 
 * Features:
 * - Automatic key rotation on 429 errors
 * - Multiple API keys support
 * - Proxy support for rate limit bypass
 * - Health tracking per key
 */

import { GoogleGenAI } from '@google/genai';

interface KeyHealth {
  key: string;
  failures: number;
  lastFailure: number | null;
  isBlocked: boolean;
}

export class ApiKeyManager {
  private keys: string[] = [];
  private currentKeyIndex: number = 0;
  private keyHealthMap: Map<string, KeyHealth> = new Map();
  private proxy: string | null = null;
  
  // Config
  private readonly MAX_FAILURES = 3;
  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown after block

  constructor(env: any) {
    this.loadKeysFromEnv(env);
    this.loadProxyFromEnv(env);
    
    console.log(`🔑 [ApiKeyManager] Loaded ${this.keys.length} API key(s)`);
    if (this.proxy) {
      console.log(`🌐 [ApiKeyManager] Using proxy: ${this.proxy}`);
    }
  }

  /**
   * Load API keys from environment variables
   * Format: GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
   */
  private loadKeysFromEnv(env: any): void {
    // Load primary key
    if (env.GEMINI_API_KEY) {
      this.keys.push(env.GEMINI_API_KEY);
      this.initKeyHealth(env.GEMINI_API_KEY);
    }

    // Load numbered keys (1, 2, 3, ...)
    let i = 1;
    while (true) {
      const key = env[`GEMINI_API_KEY_${i}`];
      if (!key) break;
      
      this.keys.push(key);
      this.initKeyHealth(key);
      i++;
    }

    if (this.keys.length === 0) {
      throw new Error('No API keys found in environment variables');
    }
  }

  /**
   * Load proxy from environment
   * Format: GEMINI_PROXY=http://proxy.example.com:8080
   */
  private loadProxyFromEnv(env: any): void {
    if (env.GEMINI_PROXY) {
      this.proxy = env.GEMINI_PROXY;
    }
  }

  /**
   * Initialize health tracking for a key
   */
  private initKeyHealth(key: string): void {
    this.keyHealthMap.set(key, {
      key: key,
      failures: 0,
      lastFailure: null,
      isBlocked: false
    });
  }

  /**
   * Get next available API key
   */
  getNextKey(): string {
    const startIndex = this.currentKeyIndex;
    
    // Try to find a healthy key
    do {
      const key = this.keys[this.currentKeyIndex];
      const health = this.keyHealthMap.get(key);
      
      if (health && !this.isKeyBlocked(health)) {
        console.log(`🔑 [ApiKeyManager] Using key index ${this.currentKeyIndex}`);
        return key;
      }
      
      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      
    } while (this.currentKeyIndex !== startIndex);
    
    // All keys blocked, use current anyway (cooldown might have passed)
    console.warn('⚠️ [ApiKeyManager] All keys blocked, using current key');
    return this.keys[this.currentKeyIndex];
  }

  /**
   * Check if key is currently blocked
   */
  private isKeyBlocked(health: KeyHealth): boolean {
    if (!health.isBlocked) return false;
    
    // Check if cooldown has passed
    if (health.lastFailure && Date.now() - health.lastFailure > this.COOLDOWN_MS) {
      health.isBlocked = false;
      health.failures = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Report successful API call
   */
  reportSuccess(key: string): void {
    const health = this.keyHealthMap.get(key);
    if (health) {
      health.failures = 0;
      health.isBlocked = false;
      health.lastFailure = null;
    }
  }

  /**
   * Report failed API call (429 or other rate limit error)
   */
  reportFailure(key: string, is429: boolean = false): void {
    const health = this.keyHealthMap.get(key);
    if (!health) return;
    
    health.failures++;
    health.lastFailure = Date.now();
    
    if (is429 || health.failures >= this.MAX_FAILURES) {
      health.isBlocked = true;
      console.warn(`⚠️ [ApiKeyManager] Key blocked (failures: ${health.failures})`);
      
      // Rotate to next key
      this.rotateKey();
    }
  }

  /**
   * Manually rotate to next key
   */
  rotateKey(): void {
    const oldIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    console.log(`🔄 [ApiKeyManager] Rotated key: ${oldIndex} → ${this.currentKeyIndex}`);
  }

  /**
   * Create GoogleGenAI instance with current key
   */
  createClient(): { client: GoogleGenAI; key: string } {
    const key = this.getNextKey();
    
    const config: any = { apiKey: key };
    
    // Add proxy if available
    if (this.proxy) {
      config.baseUrl = this.proxy;
    }
    
    return {
      client: new GoogleGenAI(config),
      key: key
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
        const { client, key } = this.createClient();
        const result = await operation(client);
        
        // Success! Report it
        this.reportSuccess(key);
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a 429 error
        const is429 = this.is429Error(error);
        
        if (is429) {
          console.warn(`⚠️ [ApiKeyManager] Rate limit hit (attempt ${attempt + 1}/${maxRetries})`);
          
          // Report failure and rotate key
          const { key } = this.createClient();
          this.reportFailure(key, true);
          
          // Wait a bit before retry
          await this.sleep(1000 * (attempt + 1));
          
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
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota exceeded')
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
      proxy: this.proxy,
      keyHealth: Array.from(this.keyHealthMap.values()).map((health, index) => ({
        index: index,
        failures: health.failures,
        isBlocked: health.isBlocked,
        lastFailure: health.lastFailure ? new Date(health.lastFailure).toISOString() : null
      }))
    };
  }
}
