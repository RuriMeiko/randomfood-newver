import { log } from '@/utils/logger';

export interface GeminiResponse {
  suggestion: string;
  success: boolean;
  error?: string;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate random food suggestion using Gemini API
   */
  async generateFoodSuggestion(userPrompt?: string): Promise<GeminiResponse> {
    try {
      const prompt = userPrompt || 'Suggest a random delicious food dish for me to eat today. Just give me the dish name and a brief description in Vietnamese. Keep it simple and appetizing.';

      const requestBody = {
        contents: [{
          parts: [{
            text: `${prompt}

Please respond with just the food suggestion in this format:
🍽️ [Food Name]
📝 [Brief description in Vietnamese]

Keep it concise and appetizing. No additional text or explanations.`
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 200,
        }
      };

      log.debug('Calling Gemini API for food suggestion', { 
        hasPrompt: !!userPrompt,
        promptLength: prompt.length 
      });

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Gemini API error', undefined, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return {
          success: false,
          suggestion: '',
          error: `API Error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        log.error('No candidates in Gemini response', undefined, { response: data });
        return {
          success: false,
          suggestion: '',
          error: 'No suggestions generated'
        };
      }

      const suggestion = data.candidates[0]?.content?.parts[0]?.text || '';
      
      if (!suggestion.trim()) {
        log.error('Empty suggestion from Gemini', undefined, { data });
        return {
          success: false,
          suggestion: '',
          error: 'Empty suggestion received'
        };
      }

      log.info('Gemini food suggestion generated', { 
        suggestionLength: suggestion.length,
        hasUserPrompt: !!userPrompt
      });

      return {
        success: true,
        suggestion: suggestion.trim()
      };

    } catch (error: any) {
      log.error('Error calling Gemini API', error, {
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      return {
        success: false,
        suggestion: '',
        error: error.message
      };
    }
  }

  /**
   * Generate food suggestion based on specific criteria
   */
  async generateFoodWithCriteria(criteria: {
    cuisine?: string;
    mealType?: string;
    dietary?: string;
    mood?: string;
  }): Promise<GeminiResponse> {
    let prompt = 'Suggest a delicious food dish';
    
    const conditions = [];
    if (criteria.cuisine) conditions.push(`${criteria.cuisine} cuisine`);
    if (criteria.mealType) conditions.push(`for ${criteria.mealType}`);
    if (criteria.dietary) conditions.push(`${criteria.dietary} dietary preference`);
    if (criteria.mood) conditions.push(`suitable for ${criteria.mood} mood`);
    
    if (conditions.length > 0) {
      prompt += ` with ${conditions.join(', ')}`;
    }
    
    prompt += '. Respond in Vietnamese with dish name and brief description.';
    
    return this.generateFoodSuggestion(prompt);
  }
}