/**
 * Sticker Service
 * Handles sticker selection and Telegram message sending with stickers
 */

import TelegramApi from '../telegram/api.js';
const stickerMap = require('../stickers/sticker-map.json');

export class StickerService {
  getStickerForSituation(situation: string, emotion?: string): string | null {
    try {
      // Check if it's an emotion sticker
      if (emotion && stickerMap.emotions[emotion]) {
        const emotionStickers = stickerMap.emotions[emotion];
        const stickerKeys = Object.keys(emotionStickers);
        if (stickerKeys.length > 0) {
          const randomKey = stickerKeys[Math.floor(Math.random() * stickerKeys.length)];
          return emotionStickers[randomKey];
        }
      }

      // Check if it's a situation sticker
      if (stickerMap.situations[situation]) {
        const situationStickers = stickerMap.situations[situation];
        const stickerKeys = Object.keys(situationStickers);
        if (stickerKeys.length > 0) {
          const randomKey = stickerKeys[Math.floor(Math.random() * stickerKeys.length)];
          return situationStickers[randomKey];
        }
      }

      // Check for random stickers
      if (situation === 'random' && stickerMap.random) {
        const randomStickers = stickerMap.random;
        const stickerKeys = Object.keys(randomStickers);
        if (stickerKeys.length > 0) {
          const randomKey = stickerKeys[Math.floor(Math.random() * stickerKeys.length)];
          return randomStickers[randomKey];
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting sticker:', error);
      return null;
    }
  }

  async sendMessagesWithAIStickers(
    chatId: number,
    messages: { text: string; delay: string; sticker?: string }[],
    telegramToken: string,
    replyToMessageId?: number,
    messageThreadId?: number
  ) {
    try {
      const telegramApi = new TelegramApi(telegramToken);
      
      for (const [index, message] of messages.entries()) {
        const delay = parseInt(message.delay) || 1000;
        
        if (index > 0) {
          // Show typing indicator during delay
          await telegramApi.sendChatAction(chatId, 'typing');
          
          // Wait for the specified delay
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Send sticker if specified
        if (message.sticker) {
          const stickerId = this.getStickerForSituation(message.sticker);
          if (stickerId) {
            await telegramApi.sendSticker(chatId, stickerId, messageThreadId);
            
          }
        }

        // Send text message
        await telegramApi.sendMessage({
          chat_id: chatId,
          text: message.text,
          reply_to_message_id: replyToMessageId,
          message_thread_id: messageThreadId
        });
      }
    } catch (error) {
      console.error('❌ Error sending messages with stickers:', error);
      throw error;
    }
  }
}