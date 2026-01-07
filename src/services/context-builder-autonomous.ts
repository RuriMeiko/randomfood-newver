/**
 * Context Builder Service - Autonomous Agent Version
 * 
 * Philosophy:
 * - No hardcoded database schema
 * - Only provides observable facts: current user, time, recent messages
 * - Database structure is discovered via tools, not provided in context
 * - Returns structured format for direct Gemini API usage
 */

import type { TelegramMessage } from '../types/telegram';
import type { DatabaseService } from './database';
import { EmotionService } from './emotion';
import { AUTONOMOUS_AGENT_PROMPT } from '../prompts/autonomous-agent';

export interface ContextResult {
  systemInstruction: string;
  conversationHistory: any[];
  metadata: {
    userId: number;
    groupId: number | null;
    currentTime: string;
    chatType: string;
  };
}

export class ContextBuilderService {
  private emotionService: EmotionService;

  constructor(
    private dbService: DatabaseService,
    emotionService?: EmotionService
  ) {
    this.emotionService = emotionService || new EmotionService(dbService);
  }

  /**
   * Build complete context with system instruction + conversation history
   * Returns structured format ready for Gemini API
   */
  async buildContext(message: TelegramMessage): Promise<ContextResult> {
    console.log('\n📦 [ContextBuilder] ============================================');
    console.log('📦 [ContextBuilder] BUILDING CONTEXT FOR GEMINI API');
    console.log('📦 [ContextBuilder] ============================================');

    console.log('👤 [ContextBuilder] Step 1: Getting user and group IDs...');
    const userId = await this.dbService.getUserId(message.from?.id || 0);
    const groupId = message.chat.type === 'private'
      ? null
      : await this.dbService.getGroupId(message.chat.id);
    console.log(`✅ [ContextBuilder] User ID: ${userId}, Group ID: ${groupId || 'N/A (private chat)'}`);

    // Determine pronoun usage based on Telegram ID
    const tgUserId = message.from?.id || 0;
    const specialUserIds = [1775446945, 942231869, 6048017680];
    const isSpecialUser = specialUserIds.includes(tgUserId);
    let pronounInstruction = '';
    if (isSpecialUser) {
      pronounInstruction = `
=== SPECIAL RELATIONSHIP OVERRIDE (CRITICAL) ===
User ID ${tgUserId} is a VIP/Special Person.
- **PRONOUNS:** You MUST refer to yourself as "em" and the user as "anh".
- **TONE ADJUSTMENT:** Even if you are Gen Z/Chaotic, keep a layer of sweetness/softness for this user.
- **EXAMPLES:** "dạ anh", "anh ơi", "bé biết rùi nè anh".
`;
      console.log('🎭 [ContextBuilder] Special user detected - using em/anh pronouns');
    } else {
      pronounInstruction = `
=== SOCIAL DYNAMICS (ADAPTIVE PRONOUNS) ===
Observe the conversation history to mirror the user's vibe:
- If User says "anh/em" -> You say "anh/em".
- If User says "mày/tao" -> You say "tao/mày" (be sassy).
- If Unsure/Default -> You say "tui" and call user "bà" or "ông".
`;
      console.log('🎭 [ContextBuilder] Regular user - pronouns based on conversation style');
    }

    // Get current time in Vietnam timezone
    console.log('⏰ [ContextBuilder] Step 2: Getting current time...');
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
    console.log(`✅ [ContextBuilder] Time: ${vietnamTime}`);

    // Get emotional context
    console.log('💭 [ContextBuilder] Step 3: Getting emotional state...');
    const emotionalContext = await this.emotionService.getEmotionalContext();
    console.log(`✅ [ContextBuilder] Emotion: ${emotionalContext.substring(0, 100)}...`);

    // Get cross-chat context (RAG for multi-chat awareness)
    console.log('🔗 [ContextBuilder] Step 3.5: Building cross-chat context (RAG)...');
    let crossChatContext = '';
    const userTgId = message.from?.id || 0;
    const currentChatId = message.chat.id;
    
    if (userTgId) {
      try {
        // Get all chats where user participated
        const userChats = await this.dbService.getUserChats(userTgId);
        
        // Filter: only chats with recent activity (within 2 hours)
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const now = new Date();
        
        const recentChats = userChats
          .filter(chat => {
            // Skip current chat
            if (chat.chatId === currentChatId) return false;
            
            // Check if last message is within 2 hours
            if (!chat.lastMessageAt) return false;
            
            const lastMessageTime = new Date(chat.lastMessageAt as Date);
            const timeDiff = now.getTime() - lastMessageTime.getTime();
            
            return timeDiff <= TWO_HOURS_MS;
          })
          .slice(0, 2); // Only take 2 most recent chats
        
        console.log(`   🔗 Found ${userChats.length} total chats, ${recentChats.length} with recent activity (< 2h)`);
        
        if (recentChats.length > 0) {
          // Get 25 messages from each recent chat
          const chatIds = recentChats.map(c => c.chatId);
          const messagesMap = await this.dbService.getRecentMessagesFromChats(chatIds, 25);
          
          // Build cross-chat context
          const contextParts: string[] = [];
          
          for (const chat of recentChats) {
            const chatMetadata = await this.dbService.getChatMetadata(chat.chatId);
            const messages = messagesMap[chat.chatId] || [];
            
            if (messages.length > 0) {
              const lastMsgTime = new Date(chat.lastMessageAt as Date);
              const minutesAgo = Math.floor((now.getTime() - lastMsgTime.getTime()) / (60 * 1000));
              const timeAgoText = minutesAgo < 60 
                ? `${minutesAgo} phút trước` 
                : `${Math.floor(minutesAgo / 60)} giờ ${minutesAgo % 60} phút trước`;
              
              const msgPreview = messages.slice(-5).map(m => 
                `[${m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '??:??'}] ${m.senderName}: ${m.messageText.substring(0, 60)}${m.messageText.length > 60 ? '...' : ''}`
              ).join('\n');
              
              contextParts.push(`
📍 ${chatMetadata.chatType === 'group' ? 'GROUP' : 'PRIVATE'}: "${chatMetadata.chatName}"
   Chat ID: ${chat.chatId}
   Last active: ${timeAgoText}
   Messages available: ${messages.length}
   Preview (last 5):
${msgPreview}
`);
            }
          }
          
          if (contextParts.length > 0) {
            crossChatContext = `

=== 🔗 OTHER CHATS CONTEXT (Cross-Chat RAG) ===
⚠️ User has RECENT conversations in other chats (within 2 hours). Reference when needed.

${contextParts.join('\n')}

💡 How to use:
- If user mentions something from another chat → You can reference these contexts
- If user says "như tụi tao nói ở gr kia" → Check these contexts
- ALWAYS clarify which chat you're referring to when mentioning cross-chat info
- Current chat is PRIMARY, other chats are SECONDARY context`;
            
            console.log(`   ✅ Built cross-chat context with ${contextParts.length} recent chats`);
          }
        } else {
          console.log(`   ℹ️ No recent chats found (all chats inactive for > 2 hours)`);
        }
      } catch (error) {
        console.error('   ❌ Error building cross-chat context:', error);
      }
    }

    // Get group members if in group
    let groupMembersInfo = '';
    if (message.chat.type !== 'private') {
      console.log('👥 [ContextBuilder] Step 4: Getting group members...');
      const members = await this.dbService.getGroupMembers(message.chat.id);
      console.log(`✅ [ContextBuilder] Found ${members.length} group members`);
      if (members.length > 0) {
        groupMembersInfo = `\n\n=== 👥 GROUP MEMBERS ===\n${members.map(m =>
          `- ${m.displayName || m.tgUsername || `User ${m.tgId}`} (@${m.tgUsername || 'no_username'})`
        ).join('\n')}\n\n💡 Use these names when user mentions someone. Query DB to find user_id.`;
      }
    }

    // Get replied message if this is a reply
    let repliedMessageInfo = '';
    if (message.reply_to_message) {
      console.log('🔁 [ContextBuilder] Step 5: Getting replied message context...');
      const repliedMsg = await this.dbService.getMessageByTelegramId(
        message.chat.id,
        message.reply_to_message.message_id
      );

      if (repliedMsg) {
        console.log(`✅ [ContextBuilder] Found replied message from ${repliedMsg.senderName}`);
        repliedMessageInfo = `\n\n=== 🔁 REPLYING TO ===\nFrom: ${repliedMsg.senderName}\nMessage: "${repliedMsg.messageText}"\n\n👉 User's message is a REPLY to above.`;
      } else if (message.reply_to_message.text) {
        console.log(`✅ [ContextBuilder] Using inline replied message`);
        repliedMessageInfo = `\n\n=== 🔁 REPLYING TO ===\nMessage: "${message.reply_to_message.text}"`;
      }
    }

    // Pre-load database schema
    console.log('🗄️ [ContextBuilder] Step 6: Loading database schema...');
    const schemaInfo = await this.dbService.listTables();
    console.log(`✅ [ContextBuilder] Database schema loaded`);

    // Build system instruction with current context
    console.log('📝 [ContextBuilder] Step 7: Building system instruction...');
    
    // Determine current chat context type
    const currentChatContext = message.chat.type === 'private' 
      ? `🔒 PRIVATE CHAT with ${message.from?.first_name || 'User'}`
      : `👥 GROUP CHAT: "${message.chat.title}" (${groupMembersInfo ? 'multiple participants' : 'group'})`;
    
    const contextualSystemPrompt = `${AUTONOMOUS_AGENT_PROMPT}${pronounInstruction}

=== ⏰ CURRENT TIME ===
${vietnamTime} (Vietnam)

=== 💭 EMOTIONAL STATE ===
${emotionalContext}

=== 👤 CURRENT USER ===
Name: ${message.from?.first_name || 'Unknown'} ${message.from?.last_name || ''}
Telegram ID: ${message.from?.id || 0} ${isSpecialUser ? '⭐ (SPECIAL - use em/anh)' : ''}
DB User ID: ${userId}
Username: @${message.from?.username || 'none'}

=== 💬 CURRENT CHAT CONTEXT ===
${currentChatContext}
Type: ${message.chat.type}
${message.chat.type !== 'private' ? `Group: ${message.chat.title}` : ''}
Chat ID: ${message.chat.id}
${groupId ? `DB Group ID: ${groupId}` : ''}

⚠️ IMPORTANT - Chat Type Awareness:
${message.chat.type === 'private' 
  ? '- You are chatting 1-on-1 with this user privately'
  : `- You are chatting in a GROUP with multiple people
- Respond to the group, not just one person
- Be aware of group dynamics and multiple participants
- When someone asks something, answer for everyone to see`
}${groupMembersInfo}${repliedMessageInfo}${crossChatContext}

=== 🗄️ DATABASE TABLES ===
${schemaInfo}

💡 Use tools: describe_table(name), execute_sql() for queries.`;
    console.log(`✅ [ContextBuilder] System instruction length: ${contextualSystemPrompt.length} chars`);
    console.log(`🎭 [ContextBuilder] Pronoun mode: ${isSpecialUser ? 'em/anh (special user)' : 'adaptive (based on user style)'}`);
    console.log(`💬 [ContextBuilder] Chat type: ${message.chat.type} | Cross-chat: ${crossChatContext ? 'Yes' : 'No'}`);
    // Build conversation history from DB (in Gemini format)
    console.log('💬 [ContextBuilder] Step 8: Building conversation history...');
    const conversationHistory = await this.buildConversationHistory(message);
    console.log(`✅ [ContextBuilder] Conversation history: ${conversationHistory.length} messages`);

    console.log('\n✅ [ContextBuilder] ============================================');
    console.log('✅ [ContextBuilder] CONTEXT BUILD COMPLETE!');
    console.log('✅ [ContextBuilder] ============================================');
    console.log(`📊 [ContextBuilder] Summary:`);
    console.log(`   - System instruction: ${contextualSystemPrompt.length} chars`);
    console.log(`   - Conversation messages: ${conversationHistory.length}`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Group ID: ${groupId || 'N/A'}`);
    console.log(`   - Chat type: ${message.chat.type}`);
    console.log(`   - Pronouns: ${isSpecialUser ? 'em/anh (special user ⭐)' : 'adaptive (tui/bà or mày/tao)'}`);
    console.log('\n');

    return {
      systemInstruction: contextualSystemPrompt,
      conversationHistory,
      metadata: {
        userId,
        groupId,
        currentTime: vietnamTime,
        chatType: message.chat.type
      }
    };
  }

  /**
   * Build conversation history from DB in Gemini format
   * Returns array ready for Gemini API
   */
  async buildConversationHistory(message: TelegramMessage): Promise<any[]> {
    console.log('   📚 [ContextBuilder.History] Fetching recent messages from DB...');
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    console.log(`   📚 [ContextBuilder.History] Found ${recentMessages.length} messages in DB`);

    // Convert to Gemini message format
    const history: any[] = [];

    // Take last 50 messages for current chat (API format)
    const messagesToConvert = recentMessages.slice(-50);
    console.log(`   📚 [ContextBuilder.History] Converting ${messagesToConvert.length} messages to Gemini API format...`);
    
    for (const msg of messagesToConvert) {
      const role = msg.isAI ? 'model' : 'user';

      // In group chats, prefix with sender name for context
      const senderPrefix = (!msg.isAI && message.chat.type !== 'private')
        ? `${msg.senderName}: `
        : '';

      history.push({
        role,
        parts: [{ text: `${senderPrefix}${msg.messageText}` }]
      });
    }
    console.log(`   📚 [ContextBuilder.History] Converted ${history.length} messages`);

    // Add current user message at the end
    console.log(`   📚 [ContextBuilder.History] Adding current user message...`);
    const currentSenderPrefix = message.chat.type !== 'private'
      ? `${message.from?.first_name || 'User'}: `
      : '';

    history.push({
      role: 'user',
      parts: [{ text: `${currentSenderPrefix}${message.text || ''}` }]
    });
    console.log(`   ✅ [ContextBuilder.History] Total messages in history: ${history.length}`);

    return history;
  }

}
