/**
 * AI Analyzer Service - Autonomous Agent Version
 * 
 * This version implements:
 * - Tool-based architecture
 * - Iterative tool calling loop
 * - Schema-agnostic operation
 * - Database as external memory
 */

import { 
  GoogleGenAI, 
  Type, 
  HarmBlockThreshold, 
  HarmCategory 
} from '@google/genai';
import type { TelegramMessage } from '../types/telegram';
import type { AIResponse } from '../types/ai-bot';
import type { DatabaseService } from './database';
import { allTools } from '../tools';
import { ToolExecutor } from '../tools/executor';
import { AUTONOMOUS_AGENT_PROMPT } from '../prompts/autonomous-agent';
import { ApiKeyManager } from './api-key-manager';
import type { ContextResult } from './context-builder-autonomous';

export class AIAnalyzerService {
  private genAI: GoogleGenAI | any;
  private toolExecutor: ToolExecutor;
  private apiKeyManager: ApiKeyManager | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private dbService: DatabaseService, databaseUrl?: string) {
    // If databaseUrl is provided, use ApiKeyManager with database backend
    if (databaseUrl) {
      this.apiKeyManager = new ApiKeyManager(databaseUrl);
      // Initialize async - will be awaited before first use
      this.initPromise = this.apiKeyManager.initialize().then(() => {
        console.log('✅ [AIAnalyzer] ApiKeyManager initialized with database');
      }).catch(error => {
        console.error('❌ [AIAnalyzer] Failed to initialize ApiKeyManager:', error);
        throw new Error('ApiKeyManager initialization failed - cannot proceed without API keys');
      });
    } else {
      throw new Error('DatabaseUrl is required for API key management');
    }
    
    this.toolExecutor = new ToolExecutor(dbService);
  }

  /**
   * Send typing indicator to Telegram
   */
  private async sendTypingAction(chatId?: number): Promise<void> {
    if (!chatId) return;
    
    try {
      const TELEGRAM_BOT_TOKEN = (globalThis as any).TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_BOT_TOKEN) return;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          action: 'typing'
        })
      });
    } catch (error) {
      // Silent fail - don't break the flow if typing fails
      console.debug('⚠️ [AIAnalyzer] Failed to send typing action:', error);
    }
  }

  /**
   * Ensure ApiKeyManager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null; // Only wait once
    }
  }

  /**
   * Main entry point: Process message with tool calling loop
   */
  async analyzeAndExecuteWithMessages(
    userMessage: string,
    contextBuilder: any, // ContextBuilderService instance
    message?: TelegramMessage,
    ctx?: ExecutionContext,
    conversationHistory?: any[]
  ): Promise<AIResponse> {
    console.log('🤖 [AIAnalyzer] Starting autonomous agent loop...');

    // Ensure ApiKeyManager is initialized
    await this.ensureInitialized();

    try {
      // Detect request type to choose appropriate bot config
      const requestType = await this.detectRequestType(userMessage);
      console.log(`🎯 [AIAnalyzer] Detected request type: ${requestType}`);

      let response: AIResponse;

      // Route to appropriate bot based on request type
      switch (requestType) {
        case 'search':
          response = await this.handleWithGoogleSearch(contextBuilder, message);
          break;
        case 'places':
          response = await this.handleWithGoogleMaps(contextBuilder, message);
          break;
        case 'custom':
        default:
          response = await this.toolCallingLoop(contextBuilder, message);
          break;
      }

      // Save conversation
      if (message) {
        await this.saveToolBasedConversation(message, response);
      }

      return response;

    } catch (error: any) {
      console.error('❌ [AIAnalyzer] Error in autonomous agent:', error);
      return {
        messages: [
          { text: 'ơ e bị lỗi rồi 😢', delay: '800' },
          { text: 'thử lại được không nè', delay: '1000' }
        ],
        intent: 'error'
      };
    }
  }

  /**
   * Detect request type from user message using AI classification
   */
  private async detectRequestType(userMessage: string): Promise<'custom' | 'search' | 'places'> {
    try {
      const classificationPrompt = `Classify this user message into ONE category:

User message: "${userMessage}"

Categories:
- "search": General web search queries (facts, news, information about something/someone)
- "places": Location/restaurant/place queries (find nearby restaurants, cafes, shops, addresses)
- "custom": Everything else (personal conversation, database queries, emotions, debt tracking, etc.)

Reply with ONLY ONE WORD: search, places, or custom`;

      const result = await this.apiKeyManager!.executeWithRetry(
        (client) => client.models.generateContent({
          model: 'gemini-2.0-flash-lite',
          config: {
            thinkingConfig: { thinkingBudget: 0 },
            safetySettings: this.getSafetyConfig()
          },
          contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }]
        })
      );

      const candidate = result?.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((part: any) => part.text);
      
      if (textPart?.text) {
        const classification = textPart.text.toLowerCase().trim();
        if (classification.includes('search')) return 'search';
        if (classification.includes('places')) return 'places';
        if (classification.includes('custom')) return 'custom';
      }
    } catch (error) {
      console.warn('⚠️ [AIAnalyzer] AI classification failed, using fallback:', error);
    }
    
    // Fallback: keyword-based detection
    const msg = userMessage.toLowerCase();
    const placesKeywords = ['quán', 'nhà hàng', 'ăn gần', 'quán ăn', 'gần đây', 'nearby'];
    if (placesKeywords.some(kw => msg.includes(kw))) return 'places';
    
    const searchKeywords = ['tìm kiếm', 'tra cứu', 'thông tin về', 'ai là', 'what is', 'who is'];
    if (searchKeywords.some(kw => msg.includes(kw))) return 'search';
    
    return 'custom';
  }

  /**
   * Tool calling loop with Gemini function calling
   */
  private async toolCallingLoop(
    contextBuilder: any, // ContextBuilderService
    message?: TelegramMessage
  ): Promise<AIResponse> {
    const MAX_ITERATIONS = 10;
    let iteration = 0;

    // Build context with system instruction + conversation history
    const context: ContextResult = await contextBuilder.buildContext(message);
    
    // Use conversation history from context builder (already in Gemini format)
    const conversationHistory: any[] = context.conversationHistory;

    // Context for tool execution
    const toolContext = {
      userId: context.metadata.userId,
      groupId: context.metadata.groupId,
      userMessage: message?.text,
      userTgId: message?.from?.id
    };

    // Get user location for Google Maps context
    let userLocation: { latitude: number; longitude: number } | null = null;
    if (toolContext.userId) {
      try {
        const locationData = await this.dbService.executeSqlQuery(
          `SELECT latitude, longitude FROM tg_users WHERE id = $1`,
          [toolContext.userId.toString()],
          { reason: 'Get user location for Maps context', userMessage: message?.text }
        );
        if (locationData.rows.length > 0 && locationData.rows[0].latitude) {
          userLocation = {
            latitude: parseFloat(locationData.rows[0].latitude),
            longitude: parseFloat(locationData.rows[0].longitude)
          };
          console.log(`📍 [AIAnalyzer] User location found: (${userLocation.latitude}, ${userLocation.longitude})`);
        }
      } catch (error) {
        console.warn('⚠️ [AIAnalyzer] Failed to get user location:', error);
      }
    }

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      // Send typing indicator (non-blocking)
      this.sendTypingAction(message?.chat.id).catch(() => {});

      try {
        // Call Gemini with tools
        // Note: We don't use responseSchema here because it conflicts with tool calling
        // The model needs freedom to choose between calling tools or returning final response
        
        // Use ApiKeyManager if available, otherwise direct call
        const generateContent = async () => {
          return await this.genAI.models.generateContent({
            model: 'gemini-flash-latest',
            config: {
              thinkingConfig: {
                thinkingBudget: -1
              },
              safetySettings: this.getSafetyConfig(),
              systemInstruction: [{ text: AUTONOMOUS_AGENT_PROMPT }],
              tools: [{ functionDeclarations: allTools }]
            },
            contents: conversationHistory
          });
        };
        
        let result;
        if (this.apiKeyManager) {
          // Build config with system instruction from context
          const config: any = {
            thinkingConfig: {
              thinkingBudget: -1  // Disable thinking mode - output JSON directly
            },
            safetySettings: this.getSafetyConfig(),
            systemInstruction: [{ text: context.systemInstruction }],
            tools: [
              { functionDeclarations: allTools }  // Custom function tools only
            ]
          };

          // Use ApiKeyManager with automatic retry
          result = await this.apiKeyManager.executeWithRetry(
            (client) => client.models.generateContent({
              model: 'gemini-flash-latest',
              config,
              contents: conversationHistory
            })
          );
        } else {
          // Direct call without key rotation
          const config: any = {
            thinkingConfig: {
              thinkingBudget: -1  // Disable thinking mode - output JSON directly
            },
            safetySettings: this.getSafetyConfig(),
            systemInstruction: [{ text: context.systemInstruction }],
            tools: [
              { functionDeclarations: allTools }  // Custom function tools only
            ]
          };

          result = await this.genAI.models.generateContent({
            model: 'gemini-flash-latest',
            config,
            contents: conversationHistory
          });
        }

        const candidate = result?.candidates?.[0];
        if (!candidate) {
          throw new Error('No candidate in response');
        }

        const content = candidate.content;
        
        // Handle blocked/filtered responses
        if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
          console.warn(`⚠️ [AIAnalyzer] Response blocked by ${candidate.finishReason}`);
          return {
            messages: [{ text: 'Em không thể trả lời câu này được 😅', delay: '1000' }],
            intent: 'blocked'
          };
        }
        
        // Handle empty content
        if (!content || !content.parts || content.parts.length === 0) {
          console.warn('⚠️ [AIAnalyzer] Empty or missing content.parts in response');
          console.log('Full candidate:', JSON.stringify(candidate, null, 2));
          return {
            messages: [{ text: 'Em hơi bị loạn, thử lại nhé 🥺', delay: '1000' }],
            intent: 'error'
          };
        }
        
        // Ensure functionCalls is always an array (never undefined)
        const functionCalls = content?.parts?.filter((part: any) => part.functionCall) || [];

        // If no function calls, we have a final response
        if (functionCalls.length === 0) {
          console.log('✅ [AIAnalyzer] Final response received (no more tool calls)');
          
          // Extract the text response (skip thinking parts)
          const textPart = content?.parts?.find((part: any) => part.text && !part.thought);
          if (textPart?.text) {
            // console.log('\n📄 [AIAnalyzer] Final text response:');
            // console.log(textPart.text);
            // console.log('\n');
            return this.parseFinalResponse(textPart.text);
          }

          // Fallback if no text
          return {
            messages: [{ text: 'Xin lỗi, em chưa hiểu lắm 🥺', delay: '1000' }],
            intent: 'unknown'
          };
        }

        // Execute all function calls
        console.log(`🔧 [AIAnalyzer] Executing ${functionCalls.length} tool(s)...`);
        
        // Send typing indicator (non-blocking)
        this.sendTypingAction(message?.chat.id).catch(() => {});
        
        // Add model's response with function calls to history
        if (content && content.parts) {
          conversationHistory.push({
            role: 'model',
            parts: content.parts
          });
        }

        // Execute tools and collect results
        const toolResults: any[] = [];
        for (const fcPart of functionCalls) {
          const fc = fcPart.functionCall;
          if (!fc || !fc.name) {
            console.warn('⚠️ [AIAnalyzer] Invalid function call, skipping');
            continue;
          }
          
          console.log(`\n🔧 [AIAnalyzer] === TOOL CALL: ${fc.name} ===`);
          console.log('📥 Arguments:', JSON.stringify(fc.args, null, 2));
          
          // Send typing indicator before each tool execution
          await this.sendTypingAction(message?.chat.id);
          
          const result = await this.toolExecutor.executeTool(
            { name: fc.name, args: fc.args || {} },
            toolContext
          );

          console.log('📤 Result:', result.success ? '✅ Success' : '❌ Failed');
          console.log('📄 Content length:', result.content.length, 'chars');
          if (result.content.length < 500) {
            console.log('📄 Full content:', result.content);
          } else {
            console.log('📄 Content preview:', result.content.substring(0, 500) + '...');
          }

          toolResults.push({
            functionResponse: {
              name: fc.name,
              response: { content: result.content }
            }
          });
        }

        // Send typing indicator after tools complete, before next iteration
        await this.sendTypingAction(message?.chat.id);
        
        // Add tool results to conversation
        conversationHistory.push({
          role: 'user',
          parts: toolResults
        });

        console.log('\n✅ [AIAnalyzer] Tool results added to conversation');
        console.log('📊 Conversation history length:', conversationHistory.length, 'messages');
        console.log('='.repeat(80) + '\n');

      } catch (error: any) {
        console.error(`❌ [AIAnalyzer] Error in iteration ${iteration}:`, error);
        throw error;
      }
    }

    // Max iterations reached
    console.warn('⚠️ [AIAnalyzer] Max iterations reached');
    return {
      messages: [
        { text: 'ơ e bận quá rồi 😢', delay: '800' },
        { text: 'thử đơn giản hơn được hông', delay: '1200' }
      ],
      intent: 'max_iterations'
    };
  }

  /**
   * Handle request with Google Search grounding
   */
  private async handleWithGoogleSearch(
    contextBuilder: any,
    message?: TelegramMessage
  ): Promise<AIResponse> {
    console.log('🔍 [AIAnalyzer] Using Google Search bot...');

    // Send typing indicator
    await this.sendTypingAction(message?.chat.id);

    const context: ContextResult = await contextBuilder.buildContext(message);
    const conversationHistory: any[] = context.conversationHistory;

    try {
      // Send typing before API call
      await this.sendTypingAction(message?.chat.id);
      
      const result = await this.apiKeyManager!.executeWithRetry(
        (client) => client.models.generateContent({
          model: 'gemini-flash-latest',
          config: {
            thinkingConfig: { thinkingBudget: -1 },  // Disable thinking mode
            safetySettings: this.getSafetyConfig(),
            systemInstruction: [{ text: context.systemInstruction }],
            tools: [{ googleSearch: {} }]
          },
          contents: conversationHistory
        })
      );

      const candidate = result?.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((part: any) => part.text && !part.thought);
      
      if (textPart?.text) {
        return this.parseFinalResponse(textPart.text);
      }

      return {
        messages: [{ text: 'Em không tìm được thông tin 😢', delay: '1000' }],
        intent: 'search_failed'
      };
    } catch (error: any) {
      console.error('❌ [AIAnalyzer] Google Search error:', error);
      return {
        messages: [{ text: 'Em bị lỗi khi tìm kiếm 😢', delay: '800' }],
        intent: 'error'
      };
    }
  }

  /**
   * Handle request with Google Maps grounding
   */
  private async handleWithGoogleMaps(
    contextBuilder: any,
    message?: TelegramMessage
  ): Promise<AIResponse> {
    console.log('🗺️ [AIAnalyzer] Using Google Maps bot...');

    // Send typing indicator
    await this.sendTypingAction(message?.chat.id);

    const context: ContextResult = await contextBuilder.buildContext(message);
    const conversationHistory: any[] = context.conversationHistory;

    // Get user location
    let userLocation: { latitude: number; longitude: number } | null = null;
    if (context.metadata.userId) {
      try {
        const locationData = await this.dbService.executeSqlQuery(
          `SELECT latitude, longitude FROM tg_users WHERE id = $1`,
          [context.metadata.userId.toString()],
          { reason: 'Get user location for Maps', userMessage: message?.text }
        );
        if (locationData.rows.length > 0 && locationData.rows[0].latitude) {
          userLocation = {
            latitude: parseFloat(locationData.rows[0].latitude),
            longitude: parseFloat(locationData.rows[0].longitude)
          };
        }
      } catch (error) {
        console.warn('⚠️ [AIAnalyzer] Failed to get location:', error);
      }
    }

    try {
      // Send typing before API call
      await this.sendTypingAction(message?.chat.id);
      
      const config: any = {
        thinkingConfig: { thinkingBudget: -1 },  // Disable thinking mode
        safetySettings: this.getSafetyConfig(),
        systemInstruction: [{ text: context.systemInstruction }],
        tools: [{ googleMaps: {} }]
      };

      // Add location context if available
      if (userLocation) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            }
          }
        };
      }

      const result = await this.apiKeyManager!.executeWithRetry(
        (client) => client.models.generateContent({
          model: 'gemini-flash-latest',
          config,
          contents: conversationHistory
        })
      );

      const candidate = result?.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((part: any) => part.text && !part.thought);
      
      if (textPart?.text) {
        return this.parseFinalResponse(textPart.text);
      }

      return {
        messages: [{ text: 'Em không tìm được địa điểm nào 😢', delay: '1000' }],
        intent: 'maps_failed'
      };
    } catch (error: any) {
      console.error('❌ [AIAnalyzer] Google Maps error:', error);
      return {
        messages: [{ text: 'Em bị lỗi khi tìm địa điểm 😢', delay: '800' }],
        intent: 'error'
      };
    }
  }

  /**
   * Parse the final text response from AI
   */
  private parseFinalResponse(text: string): AIResponse {
    try {
      // Clean the text first - remove any thinking process or metadata that leaked through
      let cleanedText = text.trim();
      
      // Remove <thinking> tags and their content
      cleanedText = cleanedText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
      
      // Remove numbered steps like "4. **Read Updated State:**"
      cleanedText = cleanedText.replace(/^\d+\.\s+\*\*.+?\*\*:?[\s\S]*?(?=\{|\d+\.|$)/gm, '');
      
      // Remove markdown headers and thinking process markers
      cleanedText = cleanedText.replace(/^#+\s+.+$/gm, '');
      cleanedText = cleanedText.replace(/\*\*(Read Updated State|Select Response Style|Formulate Response|Final JSON Construction|Draft Response|Emotional State):\*\*/gi, '');
      
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = cleanedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        cleanedText = jsonMatch[1];
      }
      
      // Find the first valid JSON object
      const jsonStartIndex = cleanedText.indexOf('{');
      if (jsonStartIndex !== -1) {
        cleanedText = cleanedText.substring(jsonStartIndex);
        
        // Try to extract just the JSON object (handle trailing text)
        let braceCount = 0;
        let jsonEndIndex = -1;
        for (let i = 0; i < cleanedText.length; i++) {
          if (cleanedText[i] === '{') braceCount++;
          if (cleanedText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEndIndex = i + 1;
              break;
            }
          }
        }
        
        if (jsonEndIndex !== -1) {
          cleanedText = cleanedText.substring(0, jsonEndIndex);
        }
      }
      
      console.log('🧹 [AIAnalyzer] Cleaned response text:', cleanedText.substring(0, 200));
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanedText);
      
      // Return messages as-is (AI will naturally create multiple messages)
      return {
        messages: parsed.messages || [{ text: cleanedText, delay: '1000' }],
        intent: parsed.type || 'reply'
      };
    } catch (error) {
      console.error('❌ [AIAnalyzer] Failed to parse response:', error);
      console.error('📄 [AIAnalyzer] Raw text:', text);
      
      // If parsing fails completely, return error message
      return {
        messages: [{ text: 'Xin lỗi, em bị lỗi rồi 🥺', delay: '1000' }],
        intent: 'error'
      };
    }
  }

  /**
   * Save tool-based conversation to database
   */
  private async saveToolBasedConversation(
    message: TelegramMessage,
    aiResponse: AIResponse
  ): Promise<void> {
    try {
      const chatId = message.chat.id;

      // Save AI response messages
      if (aiResponse?.messages && Array.isArray(aiResponse.messages)) {
        for (const aiMsg of aiResponse.messages) {
          await this.dbService.executeSqlQuery(
            `INSERT INTO chat_messages (chat_id, sender, sender_tg_id, message_text, delay_ms, intent) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              chatId.toString(),
              'ai',
              null,
              aiMsg.text || '',
              parseInt(aiMsg.delay) || null,
              aiResponse.intent || 'unknown'
            ],
            {
              reason: 'Save AI response to chat history',
              userMessage: message.text
            }
          );
        }
        console.log(`💾 [AIAnalyzer] Saved ${aiResponse.messages.length} AI messages to chat history`);
      }
    } catch (error) {
      console.error('❌ [AIAnalyzer] Failed to save conversation:', error);
    }
  }

  /**
   * Safety configuration - Block nothing for open conversation
   */
  private getSafetyConfig(): any[] {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];
  }

  // ==========================================
  // LEGACY COMPATIBILITY METHODS
  // (Keep for backward compatibility)
  // ==========================================

  /**
   * Legacy method for simple text responses
   * @deprecated Use analyzeAndExecuteWithMessages with contextBuilder instead
   */
  async analyzeAndExecute(
    userMessage: string,
    contextBuilder: any, // ContextBuilderService instance
    message?: TelegramMessage
  ): Promise<AIResponse> {
    const result = await this.analyzeAndExecuteWithMessages(userMessage, contextBuilder, message);
    
    // Convert messages to single response text
    const responseText = result.messages
      ?.map(msg => msg.text)
      .join(' ') || 'Xin lỗi, em chưa hiểu lắm.';

    return {
      response: responseText,
      intent: result.intent,
      sqlQuery: undefined,
      sqlParams: undefined
    };
  }
}
