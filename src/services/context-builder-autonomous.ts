/**
 * Context Builder Service - Autonomous Agent Version
 * 
 * Philosophy:
 * - No hardcoded database schema
 * - Only provides observable facts: current user, time, recent messages
 * - Database structure is discovered via tools, not provided in context
 */

import type { TelegramMessage } from '../types/telegram';
import type { DatabaseService } from './database';
import { EmotionService } from './emotion';

export class ContextBuilderService {
  private emotionService: EmotionService;

  constructor(
    private dbService: DatabaseService,
    emotionService?: EmotionService
  ) {
    this.emotionService = emotionService || new EmotionService(dbService);
  }

  /**
   * Build minimal context without schema assumptions
   * Now includes pre-loaded database schema to reduce tool calls
   */
  async buildContext(message: TelegramMessage): Promise<string> {
    const userId = await this.dbService.getUserId(message.from?.id || 0);
    const groupId = message.chat.type === 'private' 
      ? null 
      : await this.dbService.getGroupId(message.chat.id);

    // Get recent messages only (no schema details)
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    
    // Get current time in Vietnam timezone
    const currentTime = new Date();
    const vietnamTime = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(currentTime);
    
    // Get emotional context
    const emotionalContext = await this.emotionService.getEmotionalContext();
    
    // Pre-load database schema to reduce tool calls
    const schemaInfo = await this.dbService.listTables();
    
    // Build schema-agnostic context
    const context = `
=== CURRENT TIME ===
${vietnamTime} (Asia/Ho_Chi_Minh - GMT+7)

=== ${emotionalContext} ===

=== CURRENT USER ===
Name: ${message.from?.first_name || 'Unknown'} ${message.from?.last_name || ''}
Telegram ID: ${message.from?.id || 0}
Database ID: ${userId}
Username: @${message.from?.username || 'none'}

=== CURRENT CHAT ===
Type: ${message.chat.type}
${message.chat.type !== 'private' ? `Title: ${message.chat.title}` : ''}
Chat ID: ${message.chat.id}
${groupId ? `Database Group ID: ${groupId}` : ''}

=== DATABASE SCHEMA (Available Tables) ===
${schemaInfo}

Use tools like describe_table(table_name) to see column details, or execute_sql() to query data.

=== RECENT CONVERSATION HISTORY ===
(This is just summary - full conversation will be in messages format below)
Recent messages: ${recentMessages.length} messages loaded
${recentMessages.slice(-5).map(msg => {
  const msgTime = msg.createdAt ? new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(msg.createdAt)) : '??:??';
  
  return `[${msgTime}] ${msg.isAI ? 'Mây' : msg.senderName}: ${msg.messageText.substring(0, 80)}${msg.messageText.length > 80 ? '...' : ''}`;
}).join('\n')}

=== IMPORTANT REMINDERS ===
- You have database table list above, use describe_table() or execute_sql() to get/modify data
- Recent conversation history will be provided as proper messages below
- Use analyze_interaction tool to update your emotions based on user's message
- Respond naturally in Vietnamese, matching your emotional state
`;
    
    return context;
  }

  /**
   * Build conversation history as message format for AI
   */
  async buildConversationHistory(message: TelegramMessage): Promise<any[]> {
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    
    // Convert to Gemini message format with proper roles
    const history: any[] = [];
    
    for (const msg of recentMessages.slice(-20)) { // Last 20 messages for context
      const role = msg.isAI ? 'model' : 'user';
      const senderName = msg.isAI ? '' : `${msg.senderName}: `;
      
      history.push({
        role,
        parts: [{ text: `${senderName}${msg.messageText}` }]
      });
    }
    
    return history;
  }

  /**
   * Build minimal context for private chat
   */
  async buildPrivateContext(message: TelegramMessage): Promise<string> {
    return this.buildContext(message);
  }

  /**
   * Build minimal context for group chat
   */
  async buildGroupContext(message: TelegramMessage): Promise<string> {
    return this.buildContext(message);
  }
}
