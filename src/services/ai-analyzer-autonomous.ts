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
  
  // Response schema for structured JSON output
  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'Type of response',
        nullable: false
      },
      messages: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: 'Message text in Vietnamese',
              nullable: false
            },
            delay: {
              type: Type.STRING,
              description: 'Delay in milliseconds (as string)',
              nullable: false
            },
            sticker: {
              type: Type.STRING,
              description: 'Sticker file ID (always null for now)',
              nullable: true
            }
          },
          required: ['text', 'delay']
        },
        description: 'Array of messages to send'
      },
      intent: {
        type: Type.STRING,
        description: 'Brief intent description',
        nullable: false
      }
    },
    required: ['type', 'messages', 'intent']
  };
  
  // Planning schema - AI decides what tools to call
  private readonly planningSchema = {
    type: Type.OBJECT,
    properties: {
      needs_tools: {
        type: Type.BOOLEAN,
        description: 'Whether tools need to be called to answer the question',
        nullable: false
      },
      tools_to_call: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Tool name to call',
              nullable: false
            },
            args: {
              type: Type.STRING,
              description: 'Arguments for the tool as JSON string',
              nullable: false
            }
          },
          required: ['name', 'args']
        },
        description: 'List of tools to call with their arguments'
      },
      reasoning: {
        type: Type.STRING,
        description: 'Brief reasoning for tool selection or direct response',
        nullable: false
      }
    },
    required: ['needs_tools', 'tools_to_call', 'reasoning']
  };

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
    conversationHistory?: any[]
  ): Promise<AIResponse> {
    console.log('🤖 [AIAnalyzer] Starting autonomous agent loop...');

    // Ensure ApiKeyManager is initialized
    await this.ensureInitialized();

    try {
      // OPTIMIZATION: Always use custom bot first (with tools)
      // Bot will decide if it needs Google Search/Maps or can answer directly
      console.log('🎯 [AIAnalyzer] Using custom bot with tools...');
      
      const response = await this.toolCallingLoop(contextBuilder, message);
      
      // Check if bot requests Google Search
      if (response.intent === 'request_google_search') {
        console.log('🔍 [AIAnalyzer] Bot requested Google Search, calling search bot...');
        return await this.handleWithGoogleSearch(contextBuilder, message);
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
   * Tool calling loop with planning approach
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
        // Planning approach: AI returns JSON planning, code executes tools manually
        // This ensures responseSchema enforces valid JSON output always
        
        let result;
        let retryCount = 0;
        const MAX_EMPTY_RETRIES = 3;
        
        // Retry loop for empty or invalid responses
        while (retryCount < MAX_EMPTY_RETRIES) {
          try {
            console.log(`📤 [AIAnalyzer] Sending request to Gemini API (iteration: ${iteration}, retry: ${retryCount})...`);
            
            if (this.apiKeyManager) {
              // Build config with planningSchema
              const config: any = {
                thinkingConfig: {
                  thinkingBudget: -1  // Disable thinking mode - output JSON directly
                },
                safetySettings: this.getSafetyConfig(),
                systemInstruction: [{ text: context.systemInstruction }],
                responseSchema: this.planningSchema  // Use planning schema for tool orchestration
              };
              
              console.log('📋 [AIAnalyzer] Using planningSchema for tool planning');

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
                responseSchema: this.planningSchema
              };

              result = await this.genAI.models.generateContent({
                model: 'gemini-flash-latest',
                config,
                contents: conversationHistory
              });
            }

            console.log(`📥 [AIAnalyzer] Received response from Gemini API`);

            const candidate = result?.candidates?.[0];
            if (!candidate) {
              console.warn(`⚠️ [AIAnalyzer] No candidate in response (retry ${retryCount + 1}/${MAX_EMPTY_RETRIES})`);
              retryCount++;
              if (retryCount < MAX_EMPTY_RETRIES) {
                console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
                await this.sleep(2000);
                continue;
              }
              throw new Error('No candidate in response after retries');
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
              console.warn(`⚠️ [AIAnalyzer] Empty or missing content.parts in response (retry ${retryCount + 1}/${MAX_EMPTY_RETRIES})`);
              retryCount++;
              if (retryCount < MAX_EMPTY_RETRIES) {
                console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
                await this.sleep(2000);
                continue;
              }
              
              return {
                messages: [{ text: 'Em hơi bị loạn, thử lại nhé 🥺', delay: '1000' }],
                intent: 'error'
              };
            }
            
            // Extract and parse planning JSON
            const textPart = content?.parts?.find((part: any) => part.text && !part.thought);
            if (!textPart?.text) {
              console.warn(`⚠️ [AIAnalyzer] No text in response (retry ${retryCount + 1}/${MAX_EMPTY_RETRIES})`);
              retryCount++;
              if (retryCount < MAX_EMPTY_RETRIES) {
                console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
                await this.sleep(2000);
                continue;
              }
              
              return {
                messages: [{ text: 'Em hơi bị loạn, thử lại nhé 🥺', delay: '1000' }],
                intent: 'error'
              };
            }
            
            // Parse planning JSON
            let planning;
            try {
              planning = JSON.parse(textPart.text.trim());
              console.log('✅ [AIAnalyzer] Valid planning JSON received');
              console.log('📊 needs_tools:', planning.needs_tools);
              console.log('🤔 reasoning:', planning.reasoning);
              
              // Validate tools_to_call structure
              if (planning.needs_tools && planning.tools_to_call) {
                console.log('🔍 [AIAnalyzer] Tools to call:', planning.tools_to_call.length);
                for (let i = 0; i < planning.tools_to_call.length; i++) {
                  const tool = planning.tools_to_call[i];
                  console.log(`  Tool ${i + 1}:`, {
                    name: tool.name,
                    hasArgs: !!tool.args,
                    argsType: typeof tool.args
                  });
                  
                  if (!tool.name) {
                    console.error(`❌ [AIAnalyzer] Tool ${i + 1} missing name field!`);
                    console.error('  Full tool object:', JSON.stringify(tool));
                  }
                }
              }
              
              break; // Success, exit retry loop
            } catch (parseError: any) {
              console.warn(`⚠️ [AIAnalyzer] Failed to parse planning JSON (retry ${retryCount + 1}/${MAX_EMPTY_RETRIES})`);
              console.log('📄 Parse error:', parseError.message);
              console.log('📄 Raw text:', textPart.text.substring(0, 200));
              
              retryCount++;
              if (retryCount < MAX_EMPTY_RETRIES) {
                console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
                await this.sleep(2000);
                continue;
              }
              
              return {
                messages: [{ text: 'Em bị loạn rồi, thử lại sau nha 🥺', delay: '1000' }],
                intent: 'error'
              };
            }
            
          } catch (retryError: any) {
            console.error(`❌ [AIAnalyzer] Error in API call (retry ${retryCount + 1}/${MAX_EMPTY_RETRIES}):`, retryError);
            retryCount++;
            if (retryCount < MAX_EMPTY_RETRIES) {
              console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
              await this.sleep(2000);
              continue;
            }
            throw retryError;
          }
        }
        
        // Extract planning from result
        const candidate = result?.candidates?.[0];
        const content = candidate.content;
        const textPart = content?.parts?.find((part: any) => part.text && !part.thought);
        const planning = JSON.parse(textPart.text.trim());
        
        // Check if AI needs to call tools
        if (!planning.needs_tools || !planning.tools_to_call || planning.tools_to_call.length === 0) {
          console.log('✅ [AIAnalyzer] No tools needed, returning direct response');
          
          // AI decided it can answer directly - but planningSchema doesn't have messages field!
          // Need to call AI again with responseSchema to get final response
          console.log('🔄 [AIAnalyzer] Getting final response with responseSchema...');
          
          // Build simple system instruction for final response (no tool stuff)
          const finalSystemInstruction = `You are Mây, a Vietnamese Gen Z chatbot.
          
Your reasoning: ${planning.reasoning}

CRITICAL: You MUST output ONLY valid JSON following this structure:
{
  "type": "reply",
  "messages": [
    {"text": "Vietnamese message", "delay": "800", "sticker": null}
  ],
  "intent": "brief_intent"
}

Rules:
- NO plain text, NO explanations
- ONLY output the JSON object
- Multiple messages for natural conversation flow
- Vietnamese Gen Z tone (em/anh for special users)
- NO English emotion names in messages`;
          
          // Add user prompt asking for final response
          conversationHistory.push({
            role: 'user',
            parts: [{ text: 'Provide your response to the user in JSON format following the schema.' }]
          });
          
          // Call AI again with responseSchema for final response
          const finalConfig: any = {
            thinkingConfig: { thinkingBudget: -1 },
            safetySettings: this.getSafetyConfig(),
            systemInstruction: [{ text: finalSystemInstruction }],
            responseSchema: this.responseSchema  // Use response schema for final output
          };
          
          const finalResult = await this.apiKeyManager!.executeWithRetry(
            (client) => client.models.generateContent({
              model: 'gemini-flash-latest',
              config: finalConfig,
              contents: conversationHistory
            })
          );
          
          const finalCandidate = finalResult?.candidates?.[0];
          const finalTextPart = finalCandidate?.content?.parts?.find((part: any) => part.text && !part.thought);
          
          if (finalTextPart?.text) {
            return this.parseFinalResponse(finalTextPart.text);
          }
          
          return {
            messages: [{ text: 'Xin lỗi, em chưa hiểu lắm 🥺', delay: '1000' }],
            intent: 'unknown'
          };
        }

        // Execute tools manually
        console.log(`🔧 [AIAnalyzer] Executing ${planning.tools_to_call.length} tool(s) manually...`);
        
        // Send typing indicator (non-blocking)
        this.sendTypingAction(message?.chat.id).catch(() => {});
        
        // Add AI's planning to conversation
        conversationHistory.push({
          role: 'model',
          parts: [{ text: JSON.stringify(planning) }]
        });

        // Execute tools and collect results
        const toolResults: any[] = [];
        
        // Check if tools can run in parallel (all read-only)
        const readOnlyTools = ['inspect_schema', 'describe_table', 'list_tables', 'get_user_location'];
        const canRunParallel = planning.tools_to_call.every((tool: any) => 
          readOnlyTools.includes(tool.name)
        );
        
        if (canRunParallel && planning.tools_to_call.length > 1) {
          console.log(`⚡ [AIAnalyzer] Executing ${planning.tools_to_call.length} tools in parallel...`);
          
          const toolPromises = planning.tools_to_call.map(async (tool: any) => {
            console.log(`🔧 [AIAnalyzer] === TOOL CALL (parallel): ${tool.name} ===`);
            
            // Parse args from JSON string
            let parsedArgs = {};
            try {
              parsedArgs = typeof tool.args === 'string' ? JSON.parse(tool.args) : tool.args;
            } catch (e) {
              console.warn('⚠️ Failed to parse tool args:', tool.args);
            }
            
            console.log('📥 Arguments:', JSON.stringify(parsedArgs, null, 2));
            
            const result = await this.toolExecutor.executeTool(
              { name: tool.name, args: parsedArgs },
              toolContext
            );

            console.log(`📤 ${tool.name} Result:`, result.success ? '✅ Success' : '❌ Failed');
            
            return {
              tool: tool.name,
              result: result.content
            };
          });
          
          const results = await Promise.all(toolPromises);
          toolResults.push(...results);
          
        } else {
          console.log(`🔧 [AIAnalyzer] Executing ${planning.tools_to_call.length} tool(s) sequentially...`);
          
          for (const tool of planning.tools_to_call) {
            console.log(`\n🔧 [AIAnalyzer] === TOOL CALL: ${tool.name} ===`);
            
            // Parse args from JSON string
            let parsedArgs = {};
            try {
              parsedArgs = typeof tool.args === 'string' ? JSON.parse(tool.args) : tool.args;
            } catch (e) {
              console.warn('⚠️ Failed to parse tool args:', tool.args);
            }
            
            console.log('📥 Arguments:', JSON.stringify(parsedArgs, null, 2));
            
            // Send typing indicator before each tool
            await this.sendTypingAction(message?.chat.id);
            
            const result = await this.toolExecutor.executeTool(
              { name: tool.name, args: parsedArgs },
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
              tool: tool.name,
              result: result.content
            });
          }
        }

        // Send typing indicator after tools complete
        await this.sendTypingAction(message?.chat.id);
        
        // Add tool results to conversation in a structured way
        const toolResultsText = toolResults.map(tr => 
          `Tool: ${tr.tool}\nResult: ${tr.result}`
        ).join('\n\n');
        
        conversationHistory.push({
          role: 'user',
          parts: [{ text: `Tool execution results:\n\n${toolResultsText}` }]
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

    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        // Send typing before API call
        await this.sendTypingAction(message?.chat.id);
        
        console.log(`📤 [AIAnalyzer] Sending Google Search request (retry: ${retryCount})...`);
        
        // Build system instruction with JSON requirement
        const searchSystemInstruction = `${context.systemInstruction}

CRITICAL: You MUST return ONLY valid JSON in this exact format:
{
  "type": "reply",
  "messages": [{"text": "your message", "delay": "1000", "sticker": null}],
  "intent": "search_result"
}
NO markdown, NO code blocks, ONLY JSON.`;
        
        const result = await this.apiKeyManager!.executeWithRetry(
          (client) => client.models.generateContent({
            model: 'gemini-flash-latest',
            config: {
              thinkingConfig: { thinkingBudget: -1 },  // Disable thinking mode
              safetySettings: this.getSafetyConfig(),
              systemInstruction: [{ text: searchSystemInstruction }],
              tools: [{ googleSearch: {} }]
            },
            contents: conversationHistory
          })
        );

        console.log(`📥 [AIAnalyzer] Received Google Search response`);

        const candidate = result?.candidates?.[0];
        
        // Check for empty response
        if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
          console.warn(`⚠️ [AIAnalyzer] Empty Google Search response (retry ${retryCount + 1}/${MAX_RETRIES})`);
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
            await this.sleep(2000);
            continue;
          }
          return {
            messages: [{ text: 'Em không tìm được thông tin 😢', delay: '1000' }],
            intent: 'search_failed'
          };
        }
        
        const textPart = candidate?.content?.parts?.find((part: any) => part.text && !part.thought);
        
        if (textPart?.text) {
          return this.parseFinalResponse(textPart.text);
        }

        return {
          messages: [{ text: 'Em không tìm được thông tin 😢', delay: '1000' }],
          intent: 'search_failed'
        };
      } catch (error: any) {
        console.error(`❌ [AIAnalyzer] Google Search error (retry ${retryCount + 1}/${MAX_RETRIES}):`, error);
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ [AIAnalyzer] Retrying in 2 seconds...`);
          await this.sleep(2000);
          continue;
        }
        return {
          messages: [{ text: 'Em bị lỗi khi tìm kiếm 😢', delay: '800' }],
          intent: 'error'
        };
      }
    }
    
    return {
      messages: [{ text: 'Em không tìm được thông tin 😢', delay: '1000' }],
      intent: 'search_failed'
    };
  }

  /**
   * Parse the final text response from AI
   * Handles both JSON and plain text responses with improved fallback
   */
  private parseFinalResponse(text: string): AIResponse {
    console.log('🔍 [AIAnalyzer] Parsing final response...');
    console.log('📄 [AIAnalyzer] Raw response length:', text.length, 'chars');
    
    // OPTIMIZATION 3: Try direct JSON parse first (fastest path)
    try {
      const directParse = JSON.parse(text.trim());
      if (directParse.messages && Array.isArray(directParse.messages)) {
        console.log('✅ [AIAnalyzer] Direct JSON parse successful');
        return {
          messages: directParse.messages,
          intent: directParse.type || directParse.intent || 'reply'
        };
      }
    } catch {
      // Not direct JSON, continue to cleaning
    }
    
    try {
      // Clean the text - remove any thinking process or metadata
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
      
      console.log('✅ [AIAnalyzer] Successfully parsed JSON response');
      console.log('📊 [AIAnalyzer] Message count:', parsed.messages?.length || 0);
      
      // Validate and normalize response structure
      if (!parsed.messages || !Array.isArray(parsed.messages)) {
        throw new Error('Invalid response structure: missing messages array');
      }
      
      // Ensure each message has required fields
      const normalizedMessages = parsed.messages.map((msg: any) => ({
        text: msg.text || '',
        delay: msg.delay || '1000',
        sticker: msg.sticker || null
      }));
      
      return {
        messages: normalizedMessages,
        intent: parsed.type || parsed.intent || 'reply'
      };
    } catch (error) {
      console.warn('⚠️ [AIAnalyzer] Not valid JSON, treating as plain text response');
      console.log('📄 [AIAnalyzer] Plain text response:', text.substring(0, 200));
      
      // Throw error to trigger retry - don't accept plain text responses
      throw new Error('AI returned plain text instead of JSON - needs retry');
    }
  }
  
  /**
   * Sleep helper for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        threshold: HarmBlockThreshold.OFF,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.OFF,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.OFF,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.OFF,
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
