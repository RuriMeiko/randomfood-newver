import { log } from '@/utils/logger';

/** Interface for common Telegram API parameters */
interface TelegramApiBaseParams {
  chat_id: number | string;
  business_connection_id?: string | number;
}

/** Interface for message parameters */
interface SendMessageParams extends TelegramApiBaseParams {
  text: string;
  parse_mode?: string;
  reply_to_message_id?: number | string;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_markup?: object;
  message_thread_id?: number;
}

/** Interface for photo parameters */
interface SendPhotoParams extends TelegramApiBaseParams {
  photo: string;
  caption?: string;
  parse_mode?: string;
  reply_to_message_id?: number | string;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_markup?: object;
  message_thread_id?: number;
}

/** Interface for callback query parameters */
interface AnswerCallbackParams {
  callback_query_id: number | string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

/** Interface for edit message parameters */
interface EditMessageParams extends TelegramApiBaseParams {
  message_id: number;
  text: string;
  parse_mode?: string;
  disable_web_page_preview?: boolean;
  reply_markup?: object;
}

/** Type for all possible API parameters */
type TelegramApiParams =
  | SendMessageParams
  | SendPhotoParams
  | AnswerCallbackParams
  | EditMessageParams
  | Record<string, unknown>;

/** Modern Telegram API client with enhanced error handling */
export default class TelegramApi {
  private botToken: string;
  private baseUrl: string;

  constructor(token: string) {
    this.botToken = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    
    // Validate token format
    if (!token || typeof token !== 'string') {
      log.error('Invalid bot token: Token is empty or not a string', undefined, { 
        tokenType: typeof token,
        tokenLength: token?.length || 0 
      });
    } else if (!token.includes(':')) {
      log.error('Invalid bot token format: Missing colon separator', undefined, { 
        tokenStart: token.substring(0, 10) + '...',
        tokenLength: token.length 
      });
    } else {
      log.info('Bot token validated', { 
        tokenStart: token.substring(0, 10) + '...',
        hasColon: token.includes(':'),
        tokenLength: token.length,
        baseUrl: this.baseUrl.substring(0, 50) + '...'
      });
    }
  }

  /**
   * Create API request with proper parameters
   * @param method - API method name
   * @param params - Parameters for the API call
   * @returns Promise with the API response
   */
  private async makeRequest(method: string, params: TelegramApiParams): Promise<any> {
    const url = `${this.baseUrl}/${method}`;
    
    try {
      log.api.call('POST', url, { 
        method, 
        chatId: (params as any).chat_id,
        paramsKeys: Object.keys(params)
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json() as any;

      if (!response.ok || !result.ok) {
        log.error(`Telegram API Error: ${method}`, undefined, {
          method,
          status: response.status,
          statusText: response.statusText,
          telegramErrorCode: result.error_code,
          telegramDescription: result.description,
          parameters: params,
          fullResponse: result
        });
      } else {
        log.api.response('POST', `/${method}`, response.status, { 
          method,
          success: result.ok,
          resultKeys: result.result ? Object.keys(result.result) : []
        });
      }

      return result;
    } catch (error: any) {
      log.error(`Network Error: ${method}`, error, { 
        method,
        parameters: params,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(params: SendMessageParams): Promise<any> {
    const messageParams = {
      ...params,
      parse_mode: params.parse_mode || 'HTML',
    };
    return this.makeRequest('sendMessage', messageParams);
  }

  /**
   * Send a photo to a chat
   */
  async sendPhoto(params: SendPhotoParams): Promise<any> {
    const photoParams = {
      ...params,
      parse_mode: params.parse_mode || 'HTML',
    };
    return this.makeRequest('sendPhoto', photoParams);
  }

  /**
   * Send a sticker to a chat
   */
  async sendSticker(chatId: string | number, sticker: string, threadId?: number): Promise<any> {
    return this.makeRequest('sendSticker', {
      chat_id: chatId,
      sticker,
      message_thread_id: threadId,
    });
  }

  /**
   * Edit a message text
   */
  async editMessageText(params: EditMessageParams): Promise<any> {
    const editParams = {
      ...params,
      parse_mode: params.parse_mode || 'HTML',
    };
    return this.makeRequest('editMessageText', editParams);
  }

  /**
   * Answer a callback query
   */
  async answerCallbackQuery(params: AnswerCallbackParams): Promise<any> {
    return this.makeRequest('answerCallbackQuery', params);
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<any> {
    const url = `${this.baseUrl}/getMe`;
    
    try {
      log.debug('Testing bot token with getMe', { 
        url: url.substring(0, 50) + '...',
        tokenValid: this.botToken.includes(':')
      });

      const response = await fetch(url, { method: 'GET' });
      const result = await response.json() as any;

      if (!response.ok || !result.ok) {
        log.error('Bot token validation failed', undefined, {
          status: response.status,
          statusText: response.statusText,
          errorCode: result.error_code,
          description: result.description,
          url: url.substring(0, 50) + '...'
        });
      } else {
        log.info('Bot token validated successfully', { 
          botUsername: result.result?.username,
          botId: result.result?.id,
          botName: result.result?.first_name
        });
      }

      return result;
    } catch (error: any) {
      log.error('Network error during bot validation', error, {
        url: url.substring(0, 50) + '...',
        errorMessage: error.message
      });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(chatId: string | number, messageId: number): Promise<any> {
    return this.makeRequest('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  /**
   * Send typing action to show bot is processing
   */
  async sendChatAction(chatId: string | number, action: string = 'typing'): Promise<any> {
    return this.makeRequest('sendChatAction', {
      chat_id: chatId,
      action: action, // 'typing', 'upload_photo', 'record_video', etc.
    });
  }
}