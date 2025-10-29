/**
 * Utilities for cleaning and validating AI responses
 */

export class ResponseCleaner {
  /**
   * Clean JSON artifacts from response text
   */
  static cleanResponse(text: string): string {
    if (!text) return '';

    // Remove JSON structure if accidentally included
    const jsonPattern = /^\s*\{\s*".*?"\s*:\s*".*?"\s*,?\s*".*?"\s*:\s*".*?"\s*\}\s*$/;
    if (jsonPattern.test(text)) {
      // Try to extract just the response content
      try {
        const parsed = JSON.parse(text);
        return parsed.response || parsed.conversationResponse || text;
      } catch {
        return text;
      }
    }

    // Remove markdown code blocks
    text = text.replace(/```json\n?/g, '');
    text = text.replace(/```\n?/g, '');

    // Remove JSON artifacts
    text = text.replace(/^\s*{\s*"actionType".*?}/, '');
    text = text.replace(/^\s*{\s*"response":\s*"(.*?)"\s*}/, '$1');

    // Clean up extra whitespace
    text = text.trim();

    return text;
  }

  /**
   * Validate response is clean text, not JSON
   */
  static isCleanResponse(text: string): boolean {
    if (!text) return false;

    // Check if it looks like JSON
    const looksLikeJson = text.trim().startsWith('{') && text.trim().endsWith('}');
    if (looksLikeJson) {
      return false;
    }

    // Check for JSON keywords
    const hasJsonKeywords = /("actionType"|"response"|"data")/.test(text);
    if (hasJsonKeywords) {
      return false;
    }

    return true;
  }

  /**
   * Extract response from various formats
   */
  static extractResponse(rawText: string): string {
    let cleaned = this.cleanResponse(rawText);

    // If still looks like JSON, try harder
    if (!this.isCleanResponse(cleaned)) {
      // Try to find quoted response content
      const responseMatch = cleaned.match(/"response"\s*:\s*"([^"]+)"/);
      if (responseMatch) {
        cleaned = responseMatch[1];
      }

      // Try to find conversationResponse
      const convMatch = cleaned.match(/"conversationResponse"\s*:\s*"([^"]+)"/);
      if (convMatch) {
        cleaned = convMatch[1];
      }

      // Last resort: remove everything that looks like JSON
      cleaned = cleaned.replace(/\{[^}]*\}/g, '').trim();
    }

    // Decode escaped characters
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\n/g, '\n');

    return cleaned || 'Xin lỗi, tôi không hiểu. Bạn có thể nói rõ hơn không?';
  }

  /**
   * Validate response quality
   */
  static validateResponse(text: string): {
    isValid: boolean;
    issues: string[];
    cleanedText: string;
  } {
    const issues: string[] = [];
    let cleanedText = this.extractResponse(text);

    // Check if too short
    if (cleanedText.length < 3) {
      issues.push('Response too short');
    }

    // Check if still contains JSON artifacts
    if (!this.isCleanResponse(cleanedText)) {
      issues.push('Contains JSON artifacts');
    }

    // Check if repetitive
    if (cleanedText === text && text.includes('"actionType"')) {
      issues.push('Raw JSON response not parsed');
    }

    return {
      isValid: issues.length === 0,
      issues,
      cleanedText
    };
  }
}