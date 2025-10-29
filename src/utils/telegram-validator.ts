import { log } from './logger';

/**
 * Validate Telegram bot token format and test API connectivity
 */
export class TelegramValidator {
  /**
   * Validate bot token format
   */
  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      log.error('Token validation failed: Empty or invalid type', undefined, { 
        tokenType: typeof token 
      });
      return false;
    }

    // Telegram bot tokens format: {bot_id}:{token}
    if (!token.includes(':')) {
      log.error('Token validation failed: Missing colon separator', undefined, { 
        tokenStart: token.substring(0, 10) + '...' 
      });
      return false;
    }

    const parts = token.split(':');
    if (parts.length !== 2) {
      log.error('Token validation failed: Invalid format', undefined, { 
        parts: parts.length 
      });
      return false;
    }

    const [botId, tokenPart] = parts;
    
    // Bot ID should be numeric
    if (!/^\d+$/.test(botId)) {
      log.error('Token validation failed: Bot ID not numeric', undefined, { 
        botIdStart: botId.substring(0, 5) + '...' 
      });
      return false;
    }

    // Token part should be at least 35 characters (typical length)
    if (tokenPart.length < 35) {
      log.error('Token validation failed: Token part too short', undefined, { 
        tokenLength: tokenPart.length 
      });
      return false;
    }

    log.info('Token format validation passed', { 
      botId,
      tokenLength: tokenPart.length 
    });
    return true;
  }

  /**
   * Test bot token by calling getMe API
   */
  static async testBotToken(token: string): Promise<{ valid: boolean; botInfo?: any; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${token}/getMe`;
      
      log.debug('Testing bot token with getMe API', { 
        botId: token.split(':')[0],
        url: url.substring(0, 50) + '...'
      });

      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'User-Agent': 'RandomFoodBot/2.0' }
      });

      const result = await response.json() as any;

      if (!response.ok || !result.ok) {
        const error = `${response.status}: ${result.description || response.statusText}`;
        log.error('Bot token test failed', undefined, {
          status: response.status,
          statusText: response.statusText,
          errorCode: result.error_code,
          description: result.description,
          error
        });
        return { valid: false, error };
      }

      log.info('Bot token test successful', { 
        botId: result.result?.id,
        username: result.result?.username,
        firstName: result.result?.first_name,
        canJoinGroups: result.result?.can_join_groups,
        canReadAllGroupMessages: result.result?.can_read_all_group_messages
      });

      return { valid: true, botInfo: result.result };
    } catch (error: any) {
      log.error('Network error during bot token test', error, {
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { valid: false, error: error.message };
    }
  }

  /**
   * Comprehensive bot validation
   */
  static async validateBot(token: string): Promise<{ valid: boolean; botInfo?: any; errors: string[] }> {
    const errors: string[] = [];
    
    // Step 1: Format validation
    if (!this.validateTokenFormat(token)) {
      errors.push('Invalid token format');
    }

    // Step 2: API test
    const testResult = await this.testBotToken(token);
    if (!testResult.valid) {
      errors.push(`API test failed: ${testResult.error}`);
    }

    const isValid = errors.length === 0;
    
    log.info('Bot validation completed', { 
      valid: isValid,
      errorsCount: errors.length,
      botUsername: testResult.botInfo?.username
    });

    return {
      valid: isValid,
      botInfo: testResult.botInfo,
      errors
    };
  }
}