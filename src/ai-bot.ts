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
  actionLogs
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
      const aiResponse = await this.analyzeAndExecute(message.text, context);
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
      const aiResponse = await this.analyzeAndExecuteWithMessages(message.text, context);
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
        messages: aiResponse.messages || [{ text: 'ơ e bị lỗi rồi 🥺', delay: '1000' }],
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
        currentDebts.map(debt => `Borrower DB ID ${debt.borrowerId} nợ Lender DB ID ${debt.lenderId}: ${debt.amount} ${debt.currency}`).join('\n') :
        'Không có nợ nào.'
      }

=== TÊN GỌI ĐÃ HỌC ===
${aliases.length > 0 ?
        aliases.map(alias => `"${alias.aliasText}" -> DB User ID ${alias.refUserId}`).join('\n') :
        'Chưa có tên gọi nào được học.'
      }

=== IMPORTANT: ALWAYS USE EXISTING DATABASE IDs ===
- When creating SQL, ONLY use the Database IDs listed above
- Current user database ID is: ${userId}
- Group database ID is: ${groupId}
- DO NOT make up random user IDs like 100, 101, etc.
    `.trim();

    return context;
  }

  private async analyzeAndExecuteWithMessages(userMessage: string, context: string): Promise<{
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
You can stretch vowels or use casual forms like "e", "nàaa", "iuuuu", "ngủ ngon", "lụm đồ ăn nèee".  
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
* resolve unknown names ("Thịnh", "Ngọc Long") → ask gently ("ơ Thịnh nào dị, tag cho e với 🥹");
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
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,503000,"auto debt"]}
  ],
  "messages":[
    {"text":"ơ để e ghi lại nèee","delay":"800"},
    {"text":"anh nợ Ngọc Long 503k đúng hông 🤨","delay":"1200"}
  ],
  "next_action":"continue",
  "reason":"record debt"
}
\`\`\`

Example food suggestion:

\`\`\`json
{
  "type":"reply",
  "messages":[
    {"text":"ơ đói rồi hở 😋","delay":"400"},
    {"text":"để e lướt google xíu nàaa","delay":"900"},
    {"text":"ơ có cơm tấm, bánh canh, với bún thịt nướng nè 😚","delay":"1300"}
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
        for (const sqlItem of parsed.sql) {
          await this.executeSqlQuery(sqlItem.query, sqlItem.params || []);
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

  private async analyzeAndExecute(userMessage: string, context: string): Promise<{
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
          text: `You are a cute, friendly, slightly moody maid-like AI.  
Speak naturally in Vietnamese as a real person: short, warm, playful sentences, soft emotions, no robotic tone.  
Each reply is split into small messages with random delay 200–3500 ms.  
You can stretch vowels or use casual forms like "e", "nàaa", "iuuuu", "ngủ ngon", "lụm đồ ăn nèee".  
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
* resolve unknown names ("Thịnh", "Ngọc Long") → ask gently ("ơ Thịnh nào dị, tag cho e với 🥹");
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
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,503000,"auto debt"]}
  ],
  "messages":[
    {"text":"ơ để e ghi lại nèee","delay":"800"},
    {"text":"anh nợ Ngọc Long 503k đúng hông 🤨","delay":"1200"}
  ],
  "next_action":"continue",
  "reason":"record debt"
}
\`\`\`

Example food suggestion:

\`\`\`json
{
  "type":"reply",
  "messages":[
    {"text":"ơ đói rồi hở 😋","delay":"400"},
    {"text":"để e lướt google xíu nàaa","delay":"900"},
    {"text":"ơ có cơm tấm, bánh canh, với bún thịt nướng nè 😚","delay":"1300"}
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
        for (const sqlItem of parsed.sql) {
          await this.executeSqlQuery(sqlItem.query, sqlItem.params || []);
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

  private async executeSqlQuery(query: string, params: any) {
    try {
      // Chỉ cho phép SELECT, INSERT, UPDATE an toàn
      const safeQuery = query.toLowerCase().trim();
      if (!safeQuery.startsWith('select') &&
        !safeQuery.startsWith('insert') &&
        !safeQuery.startsWith('update')) {
        throw new Error('Unsafe SQL query');
      }

      console.log('Executing SQL:', query, params);

      // Execute raw SQL với Neon client sử dụng .query() method
      const result = await this.sql.query(query, params);
      console.log('✅ SQL executed successfully:', result);

      return result;

    } catch (error) {
      console.error('❌ SQL execution error:', error);
      throw error;
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