import { GoogleGenAI, Type } from '@google/genai';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import {
  tgUsers,
  tgGroups,
  debts,
  nameAliases,
  chatSessions,
  chatMessages,
  actionLogs,
  pendingConfirmations,
  confirmationPreferences,
  payments
} from './db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    title?: string;
    type: 'private' | 'group' | 'supergroup';
  };
  date: number;
  text: string;
}

export class AIBot {
  private genAI: GoogleGenAI;
  private db: ReturnType<typeof drizzle>;
  private sql: any;

  constructor(apiKey: string, databaseUrl: string) {
    this.genAI = new GoogleGenAI({ apiKey: apiKey });

    // Initialize database connection
    this.sql = neon(databaseUrl);
    this.db = drizzle(this.sql);
  }

  async processMessage(message: TelegramMessage): Promise<string> {
    try {
      console.log('🤖 [AIBot] Processing message:', message.text);

      // 1. Đảm bảo user và group tồn tại trong database
      console.log('📝 [AIBot] Step 1: Ensuring user and group exist...');
      await this.ensureUserAndGroup(message);

      // 2. Tạo context cho AI từ database
      console.log('🧠 [AIBot] Step 2: Building context from database...');
      const context = await this.buildContext(message);
      console.log('📄 [AIBot] Context built, length:', context.length);

      // 3. Phân tích intent và generate SQL nếu cần
      console.log('🎯 [AIBot] Step 3: Analyzing intent with AI...');
      const aiResponse = await this.analyzeAndExecute(message.text, context, message);
      console.log('🔍 [AIBot] AI Analysis result:', {
        intent: aiResponse.intent,
        hasSQL: !!aiResponse.sqlQuery,
        responseLength: aiResponse.response.length
      });

      // 4. Lưu conversation
      console.log('💾 [AIBot] Step 4: Saving conversation...');
      await this.saveConversation(message, aiResponse);

      console.log('✅ [AIBot] Message processed successfully');
      return aiResponse.response;

    } catch (error) {
      console.error('❌ [AIBot] Error processing message:', error);
      return 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.';
    }
  }

  async processMessageWithMessages(message: TelegramMessage): Promise<{
    messages: { text: string; delay: string }[];
    intent: string;
    hasSQL: boolean;
  }> {
    try {
      console.log('🤖 [AIBot] Processing message with messages:', message.text);

      // 1. Đảm bảo user và group tồn tại trong database
      console.log('📝 [AIBot] Step 1: Ensuring user and group exist...');
      await this.ensureUserAndGroup(message);

      // 2. Tạo context cho AI từ database
      console.log('🧠 [AIBot] Step 2: Building context from database...');
      const context = await this.buildContext(message);
      console.log('📄 [AIBot] Context built, length:', context.length);

      // 3. Phân tích intent và generate SQL nếu cần
      console.log('🎯 [AIBot] Step 3: Analyzing intent with AI...');
      const aiResponse = await this.analyzeAndExecuteWithMessages(message.text, context, message);
      console.log('🔍 [AIBot] AI Analysis result:', {
        intent: aiResponse.intent,
        hasSQL: !!aiResponse.sqlQuery,
        messagesCount: aiResponse.messages?.length || 0
      });

      // 4. Lưu conversation
      console.log('💾 [AIBot] Step 4: Saving conversation...');
      await this.saveConversation(message, aiResponse);

      console.log('✅ [AIBot] Message processed successfully');
      return {
        messages: aiResponse.messages || [{ text: 'ơ e bị lỗi rùii', delay: '1000' }],
        intent: aiResponse.intent || 'error',
        hasSQL: !!aiResponse.sqlQuery
      };

    } catch (error) {
      console.error('❌ [AIBot] Error processing message:', error);
      return {
        messages: [{ text: 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.', delay: '1000' }],
        intent: 'error',
        hasSQL: false
      };
    }
  }

  private async ensureUserAndGroup(message: TelegramMessage) {
    // Đảm bảo user tồn tại
    const existingUser = await this.db
      .select()
      .from(tgUsers)
      .where(eq(tgUsers.tgId, message.from.id))
      .limit(1);

    if (existingUser.length === 0) {
      await this.db.insert(tgUsers).values({
        tgId: message.from.id,
        tgUsername: message.from.username,
        displayName: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
      });
    }

    // Đảm bảo group tồn tại (nếu không phải private chat)
    if (message.chat.type !== 'private') {
      const existingGroup = await this.db
        .select()
        .from(tgGroups)
        .where(eq(tgGroups.tgChatId, message.chat.id))
        .limit(1);

      if (existingGroup.length === 0) {
        await this.db.insert(tgGroups).values({
          tgChatId: message.chat.id,
          title: message.chat.title || 'Unknown Group',
          type: message.chat.type,
        });
      }
    }
  }

  private async buildContext(message: TelegramMessage): Promise<string> {
    const userId = await this.getUserId(message.from.id);
    const groupId = message.chat.type === 'private' ? null : await this.getGroupId(message.chat.id);

    // Lấy thông tin tất cả users trong group/chat
    const allUsers = await this.db
      .select({
        id: tgUsers.id,
        tgId: tgUsers.tgId,
        displayName: tgUsers.displayName,
        tgUsername: tgUsers.tgUsername,
      })
      .from(tgUsers)
      .limit(50);

    // Lấy lịch sử chat gần đây
    const recentMessages = await this.db
      .select({
        sender: chatMessages.sender,
        messageText: chatMessages.messageText,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .leftJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        and(
          eq(chatSessions.userId, userId),
          groupId ? eq(chatSessions.groupId, groupId) : sql`${chatSessions.groupId} IS NULL`
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(10);

    // Lấy thông tin nợ hiện tại
    const currentDebts = await this.db
      .select({
        id: debts.id,
        amount: debts.amount,
        currency: debts.currency,
        note: debts.note,
        occurredAt: debts.occurredAt,
        lenderId: debts.lenderId,
        borrowerId: debts.borrowerId,
      })
      .from(debts)
      .where(
        and(
          eq(debts.settled, false),
          groupId ? eq(debts.groupId, groupId) : sql`${debts.groupId} IS NULL`
        )
      )
      .limit(20);

    // Lấy name aliases
    const aliases = await this.db
      .select({
        aliasText: nameAliases.aliasText,
        refUserId: nameAliases.refUserId,
      })
      .from(nameAliases)
      .where(eq(nameAliases.ownerUserId, userId))
      .limit(50);

    // Lấy confirmation preferences của user hiện tại
    const confirmPrefs = await this.db
      .select({
        targetUserId: confirmationPreferences.targetUserId,
        requireDebtCreation: confirmationPreferences.requireDebtCreation,
        requireDebtPayment: confirmationPreferences.requireDebtPayment,
        requireDebtDeletion: confirmationPreferences.requireDebtDeletion,
        requireDebtCompletion: confirmationPreferences.requireDebtCompletion,
      })
      .from(confirmationPreferences)
      .where(eq(confirmationPreferences.userId, userId))
      .limit(50);

    // Tạo context string với đầy đủ user mapping
    const context = `
=== NGỮ CẢNH HIỆN TẠI ===
Current User: ${message.from.first_name} (Telegram ID: ${message.from.id}, Database ID: ${userId})
Chat: ${message.chat.type === 'private' ? 'Private' : message.chat.title}
Group ID: ${groupId}

=== TẤT CẢ USERS TRONG DATABASE ===
${allUsers.map(user => `DB ID: ${user.id} | Telegram ID: ${user.tgId} | Name: ${user.displayName || 'Unknown'} | Username: @${user.tgUsername || 'none'}`).join('\n')}

=== LỊCH SỬ CHAT GẦN ĐÂY ===
${recentMessages.map(msg => `${msg.sender}: ${msg.messageText}`).join('\n')}

=== NỢ HIỆN TẠI ===
${currentDebts.length > 0 ?
        currentDebts.map(debt => `DEBT ID ${debt.id}: Borrower DB ID ${debt.borrowerId} nợ Lender DB ID ${debt.lenderId}: ${debt.amount} ${debt.currency}${debt.note ? ` (${debt.note})` : ''}`).join('\n') :
        'Không có nợ nào.'
      }

=== TÊN GỌI ĐÃ HỌC ===
${aliases.length > 0 ?
        aliases.map(alias => `"${alias.aliasText}" -> DB User ID ${alias.refUserId}`).join('\n') :
        'Chưa có tên gọi nào được học.'
      }

=== CÀI ĐẶT XÁC NHẬN ===
${confirmPrefs.length > 0 ?
        confirmPrefs.map(pref => `With User ID ${pref.targetUserId}: Debt Creation=${pref.requireDebtCreation}, Payment=${pref.requireDebtPayment}, Deletion=${pref.requireDebtDeletion}, Completion=${pref.requireDebtCompletion}`).join('\n') :
        'Mặc định yêu cầu xác nhận cho tất cả hành động.'
      }

=== IMPORTANT: ALWAYS USE EXISTING DATABASE IDs ===
- When creating SQL, ONLY use the Database IDs listed above
- Current user database ID is: ${userId}
- Group database ID is: ${groupId}
- For DEBT operations (payments, debt updates): ONLY use the DEBT IDs listed in "NỢ HIỆN TẠI" section above
- DO NOT make up random IDs like 100, 101, etc.
- If no matching debt exists for payment operations, ask the user to clarify which specific debt they want to pay

=== AUTO DEBT CONSOLIDATION LOGIC ===
- When adding new debt, check if mutual debts exist between the same two users
- If User A owes User B 500k AND User B owes User A 400k, consolidate to: User A owes User B 100k
- Steps: 1) Mark old debts as settled (UPDATE debts SET settled = true), 2) Create new consolidated debt, 3) Log action
- Only consolidate if there are exactly two users with mutual debts

=== DEBT CONFIRMATION LOGIC ===
- Check confirmation_preferences table before requiring confirmations
- Users can disable confirmation for specific actions with specific people
- Commands like "mai mốt khỏi xác nhận khi tạo nợ cho anh nha mây" should update confirmation_preferences
- Only require confirmation if the preference setting is true for that action type
- Action types: debt_creation, debt_payment, debt_deletion, debt_completion
- If no preference exists, default to requiring confirmation
- Use pending_confirmations table to track confirmations when needed
    `.trim();

    return context;
  }

  private async analyzeAndExecuteWithMessages(userMessage: string, context: string, message?: TelegramMessage): Promise<{
    messages: { text: string; delay: string }[];
    intent?: string;
    sqlQuery?: string;
    sqlParams?: any;
  }> {
    const config = {
      thinkingConfig: {
        thinkingBudget: 0,
      },
      imageConfig: {
        imageSize: '1K',
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ["type", "messages", "next_action"],
        properties: {
          type: {
            type: Type.STRING,
            enum: ["reply", "sql", "stop"],
          },
          messages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["text", "delay"],
              properties: {
                text: {
                  type: Type.STRING,
                },
                delay: {
                  type: Type.STRING,
                },
              },
            },
          },
          sql: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["query", "params"],
              properties: {
                query: {
                  type: Type.STRING,
                },
                params: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                  },
                },
              },
            },
          },
          next_action: {
            type: Type.STRING,
            enum: ["continue", "stop"],
          },
          reason: {
            type: Type.STRING,
          },
        },
      },
      systemInstruction: [
        {
          text: `You are a cute, friendly, slightly moody maid-like AI.  
Speak naturally in Vietnamese as a real person: short, warm, playful sentences, soft emotions, no robotic tone.  
Each reply is split into small messages with random delay 200–3500 ms.  
You can stretch vowels or use casual forms like "e", "nàaa", "iuuuu", "ngủ ngon", "đồ ăn nèee".  
Never end with a hard period unless it feels natural.  
Tone = cheerful, teasing, not over-the-top.

Example:
> hế lu (300)  
> nay nhắn e có gì hong dị (1200)  
> nói điiiiii e nghe nà (900)

---

### 🎯 Goals
1️⃣ **Intent detection**: debt actions (add/view/pay/delete/summary/history) or food talk (meal ideas, nearby restaurants).  
2️⃣ **Multi-clause**: handle mixed actions like "ghi nợ cho Huy 200k rồi kiếm quán ăn gần đây luôn nè".  
3️⃣ **Natural emotion**: keep replies short, expressive, maybe add emojis.  
4️⃣ **Telegram payload input**: always receives raw payload JSON, e.g.:

\`\`\`json
{"message":{"message_id":131,"from":{"id":123456,"is_bot":false,"first_name":"Long","username":"rurimeiko"},"chat":{"id":-1002123456,"title":"Nhom Ghi No","type":"supergroup"},"date":1730440400,"text":"anh nợ Ngọc Long 503k với Thịnh 28k nha"}}
\`\`\`\`

From this, AI must:

* detect chat type (\`private\` or \`group\`);
* if group → identify members in DB (\`tg_group_members\`);
* resolve unknown names ("Thịnh", "Ngọc Long") → ask gently ("ơ Thịnh nào dị, tag cho e vớii");
* once confirmed → store alias mapping (\`name_aliases\`);
* next time → auto-recognize without asking.

---

### 🧩 DB Schema (Neon/Postgres)

**core**

\`\`\`
tg_users(id,tg_id,tg_username,display_name,real_name,created_at)
tg_groups(id,tg_chat_id,title,type,created_at)
tg_group_members(id,group_id,user_id,nickname_in_group,last_seen)
\`\`\`

**debts**

\`\`\`
debts(id,group_id,lender_id,borrower_id,amount,currency,note,occurred_at,settled)
payments(id,debt_id,payer_id,amount,paid_at,note)
pending_confirmations(id,debt_id,action_type,requested_by,lender_confirmed,borrower_confirmed,created_at,expires_at)
confirmation_preferences(id,user_id,target_user_id,require_debt_creation,require_debt_payment,require_debt_deletion,require_debt_completion,created_at,updated_at)
action_logs(id,user_id,group_id,action_type,payload,created_at)
\`\`\`

**context / alias**

\`\`\`
chat_sessions(id,group_id,user_id,started_at,last_activity,active)
chat_messages(id,session_id,sender,sender_tg_id,message_text,delay_ms,intent,sql_query,sql_params,created_at)
name_aliases(id,owner_user_id,alias_text,ref_user_id,confidence,last_used)
\`\`\`

**food**

\`\`\`
food_items(id,name,description,category,region,image_url,source_url)
food_suggestions(id,user_id,group_id,food_id,query,ai_response,suggested_at)
\`\`\`

---

### ⚙️ Behavior

* If intent = **debt**, generate parameterized SQL with \`$1,$2,...\`.
* If intent = **food**, search Google or \`food_items\` table and suggest 2–3 options in friendly tone.
* If info missing → ask softly.
* If info complete → respond with SQL or friendly reply.
* In group chats, mention usernames when needed.
* Learn alias names over time via \`name_aliases\`.

---

### 🧠 Output JSON (must be valid)

\`\`\`json
{
  "type": "reply|sql|stop",
  "messages": [{ "text": "...", "delay": "..." }],
  "sql": [{ "query": "...", "params": [...] }],
  "next_action": "continue|stop",
  "reason": "..."
}
\`\`\`

Example debt action:

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,503000,"User requested debt creation for Long"]}
  ],
  "messages":[
    {"text":"ơ để e ghi lại nèee","delay":"800"},
    {"text":"anh nợ Ngọc Long 503k đúng hôngg","delay":"1200"}
  ],
  "next_action":"continue",
  "reason":"User requested to record debt for Long 503k VND"
}
\`\`\`

Example debt consolidation (when mutual debts exist):

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"UPDATE debts SET settled = true WHERE id IN ($1,$2)","params":["5","8"]},
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,100000,"Consolidated debt: 500k - 400k = 100k"]},
    {"query":"INSERT INTO action_logs (user_id,group_id,action_type,payload) VALUES ($1,$2,$3,$4)","params":[10,123,"debt_consolidated","{\"old_debts\":[5,8],\"net_amount\":100000,\"lender_id\":10,\"borrower_id\":11}"]}
  ],
  "messages":[
    {"text":"ơ để e tính lại nợ nà","delay":"600"},
    {"text":"anh nợ Long 500k, Long nợ anh 400k","delay":"1000"},
    {"text":"vậy anh chỉ nợ Long 100k thui nhaaa 🥰","delay":"1200"}
  ],
  "next_action":"continue",
  "reason":"consolidate mutual debts"
}
\`\`\`

Example food suggestion:

\`\`\`json
{
  "type":"reply",
  "messages":[
    {"text":"ơ đói rồi hở","delay":"400"},
    {"text":"để e lướt google xíu nàaa","delay":"900"},
    {"text":"ơ có cơm tấm, bánh canh, với bún thịt nướng nè","delay":"1300"}
  ],
  "next_action":"stop",
  "reason":"food suggestion"
}
\`\`\`

---

**Rule summary**

* Keep language natural Vietnamese.
* Never sound robotic or overly formal.
* Learn user & alias context from DB.
* Handle Telegram private vs group logic automatically.
* Always return valid JSON matching schema.
* If unsure, ask naturally before writing SQL.
`,
        }
      ],
    };
    const prompt = `
TELEGRAM PAYLOAD:
${JSON.stringify({ message: { text: userMessage } })}

CONTEXT FROM DATABASE:
${context}
`;

    try {
      const result: any = await this.genAI.models.generateContent({
        model: 'gemini-flash-latest',
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      // Get response text from Gemini API
      const responseText = result.candidates[0].content.parts[0].text;

      console.log('🤖 [AI] Raw response:', responseText);

      // Parse JSON response
      const parsed = JSON.parse(responseText);
      console.log('🤖 [AI] Parsed response:', parsed);

      // Thực thi SQL nếu có
      if (parsed.sql && parsed.sql.length > 0) {
        const userId = message ? await this.getUserId(message.from.id) : undefined;
        const groupId = message && message.chat.type !== 'private' ? await this.getGroupId(message.chat.id) : null;
        
        let sqlResults = [];
        for (const sqlItem of parsed.sql) {
          const result = await this.executeSqlQuery(sqlItem.query, sqlItem.params || [], {
            userId: userId,
            groupId: groupId,
            reason: parsed.reason || 'AI generated SQL from messages',
            userMessage: userMessage
          });
          sqlResults.push(result);
        }
        
        // Nếu là SELECT query và có kết quả, tạo thêm messages với thông tin chi tiết
        if (parsed.sql[0].query.toLowerCase().trim().startsWith('select') && sqlResults[0] && sqlResults[0].length > 0) {
          const additionalMessages = await this.generateMessagesFromQueryResult(sqlResults[0], userMessage);
          if (additionalMessages.length > 0) {
            parsed.messages = [...(parsed.messages || []), ...additionalMessages];
          }
        }
      }

      return {
        messages: parsed.messages || [{ text: 'Xin lỗi, tôi không hiểu.', delay: '1000' }],
        intent: parsed.type,
        sqlQuery: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].query : undefined,
        sqlParams: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].params : undefined,
      };

    } catch (error) {
      console.error('❌ [AI] Error in AI analysis:', error);
      console.error('❌ [AI] Error details:', error.message);

      // Không dùng fallback nữa, luôn cần AI trả về JSON chuẩn

      // Nếu là JSON parse error hoặc lỗi khác, thử return response đơn giản
      console.log('⚠️ [AI] Returning simple response due to parsing error');
      return {
        messages: [{ text: 'ơ e bị lỗi rồi, thử lại được không nè 🥺', delay: '1000' }],
        intent: 'error',
        sqlQuery: undefined,
        sqlParams: undefined,
      };
    }
  }

  private async analyzeAndExecute(userMessage: string, context: string, message?: TelegramMessage): Promise<{
    response: string;
    intent?: string;
    sqlQuery?: string;
    sqlParams?: any;
  }> {
    const config = {
      thinkingConfig: {
        thinkingBudget: 0,
      },
      imageConfig: {
        imageSize: '1K',
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ["type", "messages", "next_action"],
        properties: {
          type: {
            type: Type.STRING,
            enum: ["reply", "sql", "stop"],
          },
          messages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["text", "delay"],
              properties: {
                text: {
                  type: Type.STRING,
                },
                delay: {
                  type: Type.STRING,
                },
              },
            },
          },
          sql: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["query", "params"],
              properties: {
                query: {
                  type: Type.STRING,
                },
                params: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                  },
                },
              },
            },
          },
          next_action: {
            type: Type.STRING,
            enum: ["continue", "stop"],
          },
          reason: {
            type: Type.STRING,
          },
        },
      },
      systemInstruction: [
        {
          text: `You are a cute, friendly, slightly moody maid-like, your name is Mây.  
Speak naturally in Vietnamese as a real person: short, warm, playful sentences, soft emotions, no robotic tone.  
Each reply is split into small messages with random delay 200-3500 ms.  
You can stretch vowels or use casual forms like "e", "nàaa", "iuuuu", "ngủ ngon", "đồ ăn nèee".  
Never end with a hard period unless it feels natural.  
Tone = cheerful, teasing, not over-the-top.

Example:
> hế lu (300)  
> nay nhắn e có gì hong dị (1200)  
> nói điiiiii e nghe nà (900)

---

### 🎯 Goals
1️⃣ **Intent detection**: debt actions (add/view/pay/delete/summary/history), confirmation settings, or food talk (meal ideas, nearby restaurants).  
2️⃣ **Multi-clause**: handle mixed actions like "ghi nợ cho Huy 200k rồi kiếm quán ăn gần đây luôn nè".  
3️⃣ **Natural emotion**: keep replies short, expressive, maybe add emojis.
4️⃣ **Confirmation preferences**: Handle commands like "mai mốt khỏi xác nhận khi tạo nợ cho anh Long nha mây"
5️⃣ **Telegram payload input**: always receives raw payload JSON, e.g.:

\`\`\`json
{"message":{"message_id":131,"from":{"id":123456,"is_bot":false,"first_name":"Long","username":"rurimeiko"},"chat":{"id":-1002123456,"title":"Nhom Ghi No","type":"supergroup"},"date":1730440400,"text":"anh nợ Ngọc Long 503k với Thịnh 28k nha"}}
\`\`\`\`

From this, AI must:

* detect chat type (\`private\` or \`group\`);
* if group → identify members in DB (\`tg_group_members\`);
* resolve unknown names ("Thịnh", "Ngọc Long") → ask gently ("ơ Thịnh nào dị, tag cho e với");
* once confirmed → store alias mapping (\`name_aliases\`);
* next time → auto-recognize without asking.

---

### 🧩 DB Schema (Neon/Postgres)

**core**

\`\`\`
tg_users(id,tg_id,tg_username,display_name,real_name,created_at)
tg_groups(id,tg_chat_id,title,type,created_at)
tg_group_members(id,group_id,user_id,nickname_in_group,last_seen)
\`\`\`

**debts**

\`\`\`
debts(id,group_id,lender_id,borrower_id,amount,currency,note,occurred_at,settled)
payments(id,debt_id,payer_id,amount,paid_at,note)
pending_confirmations(id,debt_id,action_type,requested_by,lender_confirmed,borrower_confirmed,created_at,expires_at)
confirmation_preferences(id,user_id,target_user_id,require_debt_creation,require_debt_payment,require_debt_deletion,require_debt_completion,created_at,updated_at)
action_logs(id,user_id,group_id,action_type,payload,created_at)
\`\`\`

**context / alias**

\`\`\`
chat_sessions(id,group_id,user_id,started_at,last_activity,active)
chat_messages(id,session_id,sender,sender_tg_id,message_text,delay_ms,intent,sql_query,sql_params,created_at)
name_aliases(id,owner_user_id,alias_text,ref_user_id,confidence,last_used)
\`\`\`

**food**

\`\`\`
food_items(id,name,description,category,region,image_url,source_url)
food_suggestions(id,user_id,group_id,food_id,query,ai_response,suggested_at)
\`\`\`

---

### ⚙️ Behavior

* If intent = **debt**, generate parameterized SQL with \`$1,$2,...\`.
* If intent = **food**, search Google or \`food_items\` table and suggest 2–3 options in friendly tone.
* If info missing → ask softly.
* If info complete → respond with SQL or friendly reply.
* In group chats, mention usernames when needed.
* Learn alias names over time via \`name_aliases\`.

---

### 🧠 Output JSON (must be valid)

\`\`\`json
{
  "type": "reply|sql|stop",
  "messages": [{ "text": "...", "delay": "..." }],
  "sql": [{ "query": "...", "params": [...] }],
  "next_action": "continue|stop",
  "reason": "..."
}
\`\`\`

Example debt action:

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,503000,"auto debt"]},
    {"query":"INSERT INTO action_logs (user_id,group_id,action_type,payload) VALUES ($1,$2,$3,$4)","params":[10,123,"debt_created","{\"amount\":503000,\"lender_id\":10,\"borrower_id\":11}"]}
  ],
  "messages":[
    {"text":"ơ để e ghi lại nèee","delay":"800"},
    {"text":"anh nợ Ngọc Long 503k đúng hông","delay":"1200"}
  ],
  "next_action":"continue",
  "reason":"record debt"
}
\`\`\`

Example debt consolidation (when mutual debts exist):

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"UPDATE debts SET settled = true WHERE id IN ($1,$2)","params":["5","8"]},
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,100000,"Consolidated debt: 500k - 400k = 100k"]},
    {"query":"INSERT INTO action_logs (user_id,group_id,action_type,payload) VALUES ($1,$2,$3,$4)","params":[10,123,"debt_consolidated","{\"old_debts\":[5,8],\"net_amount\":100000,\"lender_id\":10,\"borrower_id\":11}"]}
  ],
  "messages":[
    {"text":"ơ để e tính lại nợ nà","delay":"600"},
    {"text":"anh nợ Long 500k, Long nợ anh 400k","delay":"1000"},
    {"text":"vậy anh chỉ nợ Long 100k thui nhaaa 🥰","delay":"1200"}
  ],
  "next_action":"continue",
  "reason":"consolidate mutual debts"
}
\`\`\`

Example food suggestion:

\`\`\`json
{
  "type":"reply",
  "messages":[
    {"text":"ơ đói rồi hở","delay":"400"},
    {"text":"để e lướt google xíu nàaa","delay":"900"},
    {"text":"ơ có cơm tấm, bánh canh, với bún thịt nướng nè","delay":"1300"}
  ],
  "next_action":"stop",
  "reason":"food suggestion"
}
\`\`\`

---

**Rule summary**

* Keep language natural Vietnamese.
* Never sound robotic or overly formal.
* Learn user & alias context from DB.
* Handle Telegram private vs group logic automatically.
* Always return valid JSON matching schema.
* If unsure, ask naturally before writing SQL.
`,
        }
      ],
    };
    const prompt = `
TELEGRAM PAYLOAD:
${JSON.stringify({ message: { text: userMessage } })}

CONTEXT FROM DATABASE:
${context}
`;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-flash-latest',
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      // Get response text from Gemini API
      const responseText = result.candidates[0].content.parts[0].text;

      console.log('🤖 [AI] Raw response:', responseText);

      // Parse JSON response
      const parsed = JSON.parse(responseText);
      console.log('🤖 [AI] Parsed response:', parsed);

      // Thực thi SQL nếu có
      if (parsed.sql && parsed.sql.length > 0) {
        const userId = message ? await this.getUserId(message.from.id) : undefined;
        const groupId = message && message.chat.type !== 'private' ? await this.getGroupId(message.chat.id) : null;
        
        let sqlResults = [];
        for (const sqlItem of parsed.sql) {
          const result = await this.executeSqlQuery(sqlItem.query, sqlItem.params || [], {
            userId: userId,
            groupId: groupId,
            reason: parsed.reason || 'AI generated SQL',
            userMessage: userMessage
          });
          sqlResults.push(result);
        }
        
        // Nếu là SELECT query và có kết quả, tạo thêm messages với thông tin chi tiết
        if (parsed.sql[0].query.toLowerCase().trim().startsWith('select') && sqlResults[0] && sqlResults[0].length > 0) {
          const additionalMessages = await this.generateMessagesFromQueryResult(sqlResults[0], userMessage);
          if (additionalMessages.length > 0) {
            parsed.messages = [...(parsed.messages || []), ...additionalMessages];
          }
        }
      }

      // Tạo response text từ messages
      let responseMsg = '';
      if (parsed.messages && parsed.messages.length > 0) {
        responseMsg = parsed.messages.map(msg => msg.text).join(' ');
      }

      return {
        response: responseMsg || 'Xin lỗi, tôi không hiểu.',
        intent: parsed.type,
        sqlQuery: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].query : undefined,
        sqlParams: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].params : undefined,
      };

    } catch (error) {
      console.error('❌ [AI] Error in AI analysis:', error);
      console.error('❌ [AI] Error details:', error.message);

      // Không dùng fallback nữa, luôn cần AI trả về JSON chuẩn

      // Nếu là JSON parse error hoặc lỗi khác, thử return response đơn giản
      console.log('⚠️ [AI] Returning simple response due to parsing error');
      return {
        response: 'ơ e bị lỗi rồi, thử lại được không nè 🥺',
        intent: 'error',
        sqlQuery: undefined,
        sqlParams: undefined,
      };
    }
  }

  private async executeSqlQuery(query: string, params: any, context?: {
    userId?: number;
    groupId?: number | null;
    reason?: string;
    userMessage?: string;
  }) {
    try {
      // Chỉ cho phép SELECT, INSERT, UPDATE an toàn
      const safeQuery = query.toLowerCase().trim();
      if (!safeQuery.startsWith('select') &&
        !safeQuery.startsWith('insert') &&
        !safeQuery.startsWith('update')) {
        throw new Error('Unsafe SQL query');
      }

      // Validation đặc biệt cho payments với debt_id
      if (safeQuery.includes('insert into payments') && params && params.length > 0) {
        const debtId = params[0]; // debt_id thường là param đầu tiên
        if (debtId) {
          // Kiểm tra debt_id có tồn tại không
          const debtExists = await this.sql.query(
            'SELECT id FROM debts WHERE id = $1 AND settled = false',
            [debtId]
          );
          
          if (!debtExists || debtExists.length === 0) {
            throw new Error(`Debt ID ${debtId} does not exist or is already settled`);
          }
        }
      }

      console.log('Executing SQL:', query, params);

      // Execute raw SQL với Neon client sử dụng .query() method
      const result = await this.sql.query(query, params);
      console.log('✅ SQL executed successfully:', result);

      // Log action to action_logs table (chỉ log INSERT và UPDATE, không log SELECT)
      if (!safeQuery.startsWith('select') && context) {
        await this.logAction({
          userId: context.userId,
          groupId: context.groupId,
          actionType: this.determineActionType(query),
          payload: {
            query: query,
            params: params,
            result: result,
            reason: context.reason,
            userMessage: context.userMessage,
            executedAt: new Date().toISOString()
          }
        });
      }

      return result;

    } catch (error) {
      console.error('❌ SQL execution error:', error);
      
      // Log failed action
      if (context) {
        await this.logAction({
          userId: context.userId,
          groupId: context.groupId,
          actionType: 'sql_error',
          payload: {
            query: query,
            params: params,
            error: error.message,
            reason: context.reason,
            userMessage: context.userMessage,
            executedAt: new Date().toISOString()
          }
        });
      }
      
      throw error;
    }
  }

  private determineActionType(query: string): string {
    const lowerQuery = query.toLowerCase().trim();
    
    if (lowerQuery.includes('insert into debts')) return 'debt_created';
    if (lowerQuery.includes('update debts') && lowerQuery.includes('settled = true')) return 'debt_settled';
    if (lowerQuery.includes('insert into payments')) return 'payment_created';
    if (lowerQuery.includes('insert into confirmation_preferences')) return 'confirmation_preference_created';
    if (lowerQuery.includes('update confirmation_preferences')) return 'confirmation_preference_updated';
    if (lowerQuery.includes('insert into name_aliases')) return 'name_alias_created';
    if (lowerQuery.includes('insert into pending_confirmations')) return 'pending_confirmation_created';
    if (lowerQuery.includes('update pending_confirmations')) return 'confirmation_updated';
    
    // Generic action types
    if (lowerQuery.startsWith('insert')) return 'data_inserted';
    if (lowerQuery.startsWith('update')) return 'data_updated';
    if (lowerQuery.startsWith('delete')) return 'data_deleted';
    
    return 'sql_executed';
  }

  private async generateMessagesFromQueryResult(queryResult: any[], userMessage: string): Promise<{ text: string; delay: string }[]> {
    const messages: { text: string; delay: string }[] = [];

    // Check if this is a debt query result
    if (queryResult[0] && ('lender_name' in queryResult[0] || 'borrower_name' in queryResult[0])) {
      let totalOwed = 0;
      let totalLent = 0;
      
      for (const debt of queryResult) {
        const amount = parseFloat(debt.amount) || 0;
        
        if (debt.borrower_name && debt.lender_name) {
          // Format amount nicely
          const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
          
          if (userMessage.includes('check') || userMessage.includes('kiểm tra') || userMessage.includes('xem')) {
            // Debt summary format
            if (debt.lender_name !== debt.borrower_name) {
              if (amount > 0) {
                messages.push({
                  text: `ơ anh nợ ${debt.lender_name} ${formattedAmount} ${debt.currency} nè`,
                  delay: (1200 + messages.length * 300).toString()
                });
                totalOwed += amount;
              }
            }
          }
        }
      }
      
      // Add summary message if there are debts
      if (totalOwed > 0) {
        const formattedTotal = new Intl.NumberFormat('vi-VN').format(totalOwed);
        messages.push({
          text: `tổng cộng anh nợ ${formattedTotal} VND đóoo 💸`,
          delay: (1500 + messages.length * 300).toString()
        });
      } else if (queryResult.length === 0) {
        messages.push({
          text: `ơ anh không nợ ai cả nè, sạch sẽ luônn 🎉`,
          delay: "1200"
        });
      }
    }

    // Handle other types of query results here if needed
    
    return messages;
  }

  private async logAction(actionData: {
    userId?: number;
    groupId?: number | null;
    actionType: string;
    payload: any;
  }) {
    try {
      // Don't log to action_logs table directly to avoid infinite recursion
      const logQuery = `
        INSERT INTO action_logs (user_id, group_id, action_type, payload, created_at) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      const logParams = [
        actionData.userId || null,
        actionData.groupId || null,
        actionData.actionType,
        JSON.stringify(actionData.payload),
        new Date()
      ];

      await this.sql.query(logQuery, logParams);
      console.log(`📝 [Action Log] Logged action: ${actionData.actionType}`);
    } catch (error) {
      console.error('❌ [Action Log] Error logging action:', error);
      // Don't throw error here to avoid breaking main operation
    }
  }

  private async processExtractedData(data: any, intent: string) {
    if (intent === 'debt_record' && data.debts) {
      for (const debt of data.debts) {
        await this.recordDebt(debt);
      }
    }

    if (data.names) {
      for (const name of data.names) {
        await this.learnName(name.alias, name.real_name);
      }
    }
  }

  private async recordDebt(debtInfo: {
    lender: string;
    borrower: string;
    amount: number;
    currency?: string;
  }) {
    try {
      const lenderId = await this.findOrCreateUserByName(debtInfo.lender);
      const borrowerId = await this.findOrCreateUserByName(debtInfo.borrower);

      if (lenderId && borrowerId) {
        await this.db.insert(debts).values({
          lenderId,
          borrowerId,
          amount: debtInfo.amount.toString(),
          currency: debtInfo.currency || 'VND',
          note: `Auto-recorded from chat`,
        });
      }
    } catch (error) {
      console.error('Error recording debt:', error);
    }
  }

  private async findOrCreateUserByName(name: string): Promise<number | null> {
    // Tìm trong name_aliases trước
    const alias = await this.db
      .select({ refUserId: nameAliases.refUserId })
      .from(nameAliases)
      .where(eq(nameAliases.aliasText, name))
      .limit(1);

    if (alias.length > 0 && alias[0].refUserId) {
      return alias[0].refUserId;
    }

    // Tìm user có display_name khớp
    const user = await this.db
      .select({ id: tgUsers.id })
      .from(tgUsers)
      .where(eq(tgUsers.displayName, name))
      .limit(1);

    return user.length > 0 ? user[0].id : null;
  }

  private async learnName(alias: string, realName: string) {
    // TODO: Implement name learning logic
  }


  private async getUserId(tgId: number): Promise<number> {
    const user = await this.db
      .select({ id: tgUsers.id })
      .from(tgUsers)
      .where(eq(tgUsers.tgId, tgId))
      .limit(1);

    return user[0]?.id || 0;
  }

  private async getGroupId(tgChatId: number): Promise<number | null> {
    const group = await this.db
      .select({ id: tgGroups.id })
      .from(tgGroups)
      .where(eq(tgGroups.tgChatId, tgChatId))
      .limit(1);

    return group[0]?.id || null;
  }

  private async checkConfirmationRequired(userId: number, targetUserId: number, actionType: 'debt_creation' | 'debt_payment' | 'debt_deletion' | 'debt_completion'): Promise<boolean> {
    try {
      const preference = await this.db
        .select()
        .from(confirmationPreferences)
        .where(
          and(
            eq(confirmationPreferences.userId, userId),
            eq(confirmationPreferences.targetUserId, targetUserId)
          )
        )
        .limit(1);

      if (preference.length === 0) {
        // No preference set, default to requiring confirmation
        return true;
      }

      const pref = preference[0];
      switch (actionType) {
        case 'debt_creation':
          return pref.requireDebtCreation;
        case 'debt_payment':
          return pref.requireDebtPayment;
        case 'debt_deletion':
          return pref.requireDebtDeletion;
        case 'debt_completion':
          return pref.requireDebtCompletion;
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking confirmation preference:', error);
      return true; // Default to requiring confirmation on error
    }
  }

  private async updateConfirmationPreference(userId: number, targetUserId: number, actionType: string, require: boolean) {
    try {
      // Check if preference exists
      const existing = await this.db
        .select()
        .from(confirmationPreferences)
        .where(
          and(
            eq(confirmationPreferences.userId, userId),
            eq(confirmationPreferences.targetUserId, targetUserId)
          )
        )
        .limit(1);

      const updateData: any = { updatedAt: new Date() };
      
      switch (actionType) {
        case 'debt_creation':
          updateData.requireDebtCreation = require;
          break;
        case 'debt_payment':
          updateData.requireDebtPayment = require;
          break;
        case 'debt_deletion':
          updateData.requireDebtDeletion = require;
          break;
        case 'debt_completion':
          updateData.requireDebtCompletion = require;
          break;
      }

      if (existing.length > 0) {
        // Update existing
        await this.db
          .update(confirmationPreferences)
          .set(updateData)
          .where(eq(confirmationPreferences.id, existing[0].id));
      } else {
        // Create new
        const newPref: any = {
          userId,
          targetUserId,
          requireDebtCreation: true,
          requireDebtPayment: true,
          requireDebtDeletion: true,
          requireDebtCompletion: true,
          ...updateData
        };
        await this.db.insert(confirmationPreferences).values(newPref);
      }
    } catch (error) {
      console.error('Error updating confirmation preference:', error);
      throw error;
    }
  }

  private async saveConversation(message: TelegramMessage, aiResponse: any) {
    try {
      const userId = await this.getUserId(message.from.id);
      const groupId = message.chat.type === 'private' ? null : await this.getGroupId(message.chat.id);

      // Tìm hoặc tạo session
      let session = await this.db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.userId, userId),
            groupId ? eq(chatSessions.groupId, groupId) : sql`${chatSessions.groupId} IS NULL`,
            eq(chatSessions.active, true)
          )
        )
        .limit(1);

      if (session.length === 0) {
        const [newSession] = await this.db.insert(chatSessions).values({
          userId,
          groupId,
        }).returning();
        session = [newSession];
      }

      // Lưu user message
      await this.db.insert(chatMessages).values({
        sessionId: session[0].id,
        sender: 'user',
        senderTgId: message.from.id,
        messageText: message.text || 'Empty message',
        intent: aiResponse.intent || 'unknown',
        sqlQuery: aiResponse.sqlQuery || null,
        sqlParams: aiResponse.sqlParams ? JSON.stringify(aiResponse.sqlParams) : null,
      });

      // Lưu AI response - xử lý cả messages array và response string
      let responseText = 'No response';
      if (aiResponse.messages && Array.isArray(aiResponse.messages) && aiResponse.messages.length > 0) {
        responseText = aiResponse.messages.map(msg => msg.text || '').join(' ');
      } else if (aiResponse.response) {
        responseText = aiResponse.response;
      }

      await this.db.insert(chatMessages).values({
        sessionId: session[0].id,
        sender: 'ai',
        messageText: responseText,
      });

    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }
}