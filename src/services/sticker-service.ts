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
    messageThreadId?: number,
    ctx?: ExecutionContext
  ) {
    try {
      const telegramApi = new TelegramApi(telegramToken);
      
      // If we have ExecutionContext, use waitUntil for non-blocking message sending
      if (ctx && messages.length > 1) {
        // Send first message immediately
        const firstMessage = messages[0];
        const firstMessagePromises = [];

        // Send first sticker if specified
        if (firstMessage.sticker) {
          const stickerId = this.getStickerForSituation(firstMessage.sticker);
          if (stickerId) {
            firstMessagePromises.push(telegramApi.sendSticker(chatId, stickerId, messageThreadId));
          }
        }

        // Send first text message
        firstMessagePromises.push(telegramApi.sendMessage({
          chat_id: chatId,
          text: firstMessage.text,
          reply_to_message_id: replyToMessageId,
          message_thread_id: messageThreadId
        }));

        // Wait for first message to be sent
        await Promise.all(firstMessagePromises);

        // Use waitUntil for remaining messages (non-blocking)
        if (messages.length > 1) {
          ctx.waitUntil(this.sendRemainingMessages(
            telegramApi,
            chatId,
            messages.slice(1),
            messageThreadId
          ));
        }
      } else {
        // Fallback: send all messages sequentially
        await this.sendAllMessagesSequentially(
          telegramApi,
          chatId,
          messages,
          replyToMessageId,
          messageThreadId
        );
      }
    } catch (error) {
      console.error('❌ Error sending messages with stickers:', error);
      throw error;
    }
  }

  /**
   * Send remaining messages with delays (used in waitUntil for non-blocking)
   */
  private async sendRemainingMessages(
    telegramApi: any,
    chatId: number,
    messages: { text: string; delay: string; sticker?: string }[],
    messageThreadId?: number
  ) {
    try {
      for (const message of messages) {
        const delay = parseInt(message.delay) || 1000;
        
        // Show typing indicator and wait for delay in parallel
        const typingPromise = telegramApi.sendChatAction(chatId, 'typing');
        const delayPromise = new Promise(resolve => setTimeout(resolve, delay));
        
        await Promise.all([typingPromise, delayPromise]);

        const messagePromises = [];

        // Send sticker if specified
        if (message.sticker) {
          const stickerId = this.getStickerForSituation(message.sticker);
          if (stickerId) {
            messagePromises.push(telegramApi.sendSticker(chatId, stickerId, messageThreadId));
          }
        }

        // Send text message
        messagePromises.push(telegramApi.sendMessage({
          chat_id: chatId,
          text: message.text,
          message_thread_id: messageThreadId
        }));

        // Send sticker and text in parallel
        await Promise.all(messagePromises);
      }
    } catch (error) {
      console.error('❌ Error sending remaining messages:', error);
    }
  }

  /**
   * Send all messages sequentially (fallback method)
   */
  private async sendAllMessagesSequentially(
    telegramApi: any,
    chatId: number,
    messages: { text: string; delay: string; sticker?: string }[],
    replyToMessageId?: number,
    messageThreadId?: number
  ) {
    for (const [index, message] of messages.entries()) {
      const delay = parseInt(message.delay) || 1000;
      console.log('Message delay:', delay);

      if (index > 0) {
        // Show typing indicator during delay
        await telegramApi.sendChatAction(chatId, 'typing');
        
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const messagePromises = [];

      // Send sticker if specified
      if (message.sticker) {
        const stickerId = this.getStickerForSituation(message.sticker);
        if (stickerId) {
          messagePromises.push(telegramApi.sendSticker(chatId, stickerId, messageThreadId));
        }
      }

      // Send text message
      messagePromises.push(telegramApi.sendMessage({
        chat_id: chatId,
        text: message.text,
        reply_to_message_id: replyToMessageId,
        message_thread_id: messageThreadId
      }));

      // Send sticker and text in parallel for each message
      await Promise.all(messagePromises);
    }
  }
}