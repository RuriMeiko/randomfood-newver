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

export class ContextBuilderService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Build minimal context without schema assumptions
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
    
    // Build schema-agnostic context
    const context = `
=== CURRENT TIME ===
${vietnamTime} (Asia/Ho_Chi_Minh - GMT+7)

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

=== RECENT CONVERSATION HISTORY (Last 50 messages) ===
${recentMessages.length > 0 ? 
  recentMessages.map(msg => {
    // Format timestamp for each message
    const msgTime = msg.createdAt ? new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(msg.createdAt)) : 'Unknown time';
    
    return `[${msgTime}] ${msg.senderName}: ${msg.messageText}`;
  }).join('\\n') : 
  'No previous messages in this conversation.'
}

=== IMPORTANT INSTRUCTIONS ===

You do NOT have information about:
- Database schema (tables, columns, relationships)
- Existing debts or user data
- Name aliases or preferences

To access this information, you MUST:
1. Use tools to inspect the database schema
2. Use tools to query for specific data
3. Never assume what tables or columns exist

The database is your external memory. Observe it, don't assume it.
`;
    
    return context;
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
