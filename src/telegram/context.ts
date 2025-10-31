import TelegramApi from './api';
import { log } from '@/utils/logger';

/** Telegram update types */
export type UpdateType = 'message' | 'callback' | 'inline' | 'photo' | 'document' | 'business_message';

/** Telegram execution context for handling updates */
export class TelegramExecutionContext {
  public api: TelegramApi;
  public update: any;
  public update_type: UpdateType;
  public chat_id?: string | number;
  public user_id?: string | number;
  public message_id?: number;
  public callback_query_id?: string;
  public text?: string;
  public data?: string;
  public reply_to_message?: {
    message_id: number;
    from: any;
    text?: string;
    date: number;
  };

  constructor(api: TelegramApi, update: any) {
    this.api = api;
    this.update = update;
    this.update_type = this.determineUpdateType(update);
    this.extractUpdateData(update);
  }

  /**
   * Determine the type of update received
   */
  private determineUpdateType(update: any): UpdateType {
    if (update.message) {
      if (update.message.photo) return 'photo';
      if (update.message.document) return 'document';
      return 'message';
    }
    if (update.callback_query) return 'callback';
    if (update.inline_query) return 'inline';
    if (update.business_message) return 'business_message';
    return 'message';
  }

  /**
   * Extract relevant data from the update
   */
  private extractUpdateData(update: any) {
    // Extract common data
    if (update.message) {
      this.chat_id = update.message.chat.id;
      this.user_id = update.message.from?.id;
      this.message_id = update.message.message_id;
      this.text = update.message.text;
      
      // Store reply_to_message info if present
      if (update.message.reply_to_message) {
        this.reply_to_message = {
          message_id: update.message.reply_to_message.message_id,
          from: update.message.reply_to_message.from,
          text: update.message.reply_to_message.text,
          date: update.message.reply_to_message.date
        };
      }
    } else if (update.callback_query) {
      this.chat_id = update.callback_query.message?.chat.id;
      this.user_id = update.callback_query.from?.id;
      this.message_id = update.callback_query.message?.message_id;
      this.callback_query_id = update.callback_query.id;
      this.data = update.callback_query.data;
      this.text = update.callback_query.data;
    } else if (update.inline_query) {
      this.user_id = update.inline_query.from?.id;
      this.text = update.inline_query.query;
    } else if (update.business_message) {
      this.chat_id = update.business_message.chat.id;
      this.user_id = update.business_message.from?.id;
      this.message_id = update.business_message.message_id;
      this.text = update.business_message.text;
    }
  }

  /**
   * Send a message using this context
   */
  async sendMessage(text: string, options: {
    parse_mode?: string;
    reply_markup?: any;
    message_thread_id?: number;
    disable_web_page_preview?: boolean;
  } = {}): Promise<any> {
    if (!this.chat_id) {
      log.error('Cannot send message: chat_id not available in context', undefined, { update_type: this.update_type });
      return { ok: false, error: 'No chat_id available' };
    }

    // Use plain text mode to avoid HTML parsing issues
    return this.api.sendMessage({
      chat_id: this.chat_id,
      text,
      parse_mode: undefined, // Use plain text mode to avoid HTML parsing errors
      reply_markup: options.reply_markup,
      message_thread_id: options.message_thread_id,
      disable_web_page_preview: options.disable_web_page_preview,
    });
  }

  /**
   * Send a photo using this context
   */
  async sendPhoto(photo: string, options: {
    caption?: string;
    parse_mode?: string;
    reply_markup?: any;
    message_thread_id?: number;
  } = {}): Promise<any> {
    if (!this.chat_id) {
      log.error('Cannot send photo: chat_id not available in context', undefined, { update_type: this.update_type });
      return { ok: false, error: 'No chat_id available' };
    }

    return this.api.sendPhoto({
      chat_id: this.chat_id,
      photo,
      caption: options.caption,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup,
      message_thread_id: options.message_thread_id,
    });
  }

  /**
   * Edit the current message (for callback queries)
   */
  async editMessage(text: string, options: {
    parse_mode?: string;
    reply_markup?: any;
    disable_web_page_preview?: boolean;
  } = {}): Promise<any> {
    if (!this.chat_id || !this.message_id) {
      log.error('Cannot edit message: chat_id or message_id not available', undefined, { 
        update_type: this.update_type,
        has_chat_id: !!this.chat_id,
        has_message_id: !!this.message_id 
      });
      return { ok: false, error: 'No chat_id or message_id available' };
    }

    return this.api.editMessageText({
      chat_id: this.chat_id,
      message_id: this.message_id,
      text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup,
      disable_web_page_preview: options.disable_web_page_preview,
    });
  }

  /**
   * Answer callback query
   */
  async answerCallbackQuery(text?: string, options: {
    show_alert?: boolean;
    url?: string;
    cache_time?: number;
  } = {}): Promise<any> {
    if (!this.callback_query_id) {
      log.error('Cannot answer callback: callback_query_id not available', undefined, { update_type: this.update_type });
      return { ok: false, error: 'No callback_query_id available' };
    }

    return this.api.answerCallbackQuery({
      callback_query_id: this.callback_query_id,
      text,
      show_alert: options.show_alert,
      url: options.url,
      cache_time: options.cache_time,
    });
  }

  /**
   * Get user information from the update
   */
  getUser(): any {
    if (this.update.message?.from) return this.update.message.from;
    if (this.update.callback_query?.from) return this.update.callback_query.from;
    if (this.update.inline_query?.from) return this.update.inline_query.from;
    if (this.update.business_message?.from) return this.update.business_message.from;
    return null;
  }

  /**
   * Get chat information from the update
   */
  getChat(): any {
    if (this.update.message?.chat) return this.update.message.chat;
    if (this.update.callback_query?.message?.chat) return this.update.callback_query.message.chat;
    if (this.update.business_message?.chat) return this.update.business_message.chat;
    return null;
  }

  /**
   * Check if the update is from a private chat
   */
  isPrivateChat(): boolean {
    const chat = this.getChat();
    return chat?.type === 'private';
  }

  /**
   * Check if the update is from a group chat
   */
  isGroupChat(): boolean {
    const chat = this.getChat();
    return chat?.type === 'group' || chat?.type === 'supergroup';
  }

  /**
   * Send typing action to show bot is processing
   */
  async sendTypingAction(): Promise<any> {
    if (!this.chat_id) {
      log.error('Cannot send typing action: chat_id not available in context', undefined, { update_type: this.update_type });
      return { ok: false, error: 'No chat_id available' };
    }

    return this.api.sendChatAction(this.chat_id, 'typing');
  }

  /**
   * Get command and arguments from message text
   */
  getCommand(): { command: string; args: string[] } {
    if (!this.text) return { command: '', args: [] };
    
    const parts = this.text.trim().split(' ');
    const command = parts[0]?.startsWith('/') ? parts[0].slice(1) : '';
    const args = parts.slice(1);
    
    return { command, args };
  }

  /**
   * Check if this message is a reply to another message
   */
  isReply(): boolean {
    return !!this.reply_to_message;
  }

  /**
   * Check if this message is a reply to the bot
   */
  isReplyToBot(): boolean {
    if (!this.reply_to_message) return false;
    
    // Check if the replied message is from the bot
    // Bot usernames usually contain 'bot' or have is_bot = true
    const fromUser = this.reply_to_message.from;
    return fromUser?.is_bot === true || 
           fromUser?.username?.toLowerCase().includes('bot') ||
           fromUser?.username === 'randomfoodruribot';
  }

  /**
   * Get the original message that was replied to
   */
  getRepliedMessage(): { message_id: number; from: any; text?: string; date: number } | null {
    return this.reply_to_message || null;
  }
}