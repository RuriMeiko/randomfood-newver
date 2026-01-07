/**
 * Telegram API Types
 * Extracted from ai-bot.ts for better type organization
 */

export interface TelegramMessage {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  sender_boost_count?: number;
  sender_business_bot?: TelegramUser;
  date: number;
  business_connection_id?: string;
  chat: TelegramChat;

  forward_origin?: MessageOrigin;
  is_topic_message?: boolean;
  is_automatic_forward?: boolean;

  reply_to_message?: TelegramMessage;
  external_reply?: ExternalReplyInfo;
  quote?: TextQuote;
  reply_to_story?: Story;
  reply_to_checklist_task_id?: number;

  via_bot?: TelegramUser;
  edit_date?: number;

  has_protected_content?: boolean;
  is_from_offline?: boolean;
  is_paid_post?: boolean;

  media_group_id?: string;
  author_signature?: string;
  paid_star_count?: number;

  text?: string;
  entities?: MessageEntity[];
  link_preview_options?: LinkPreviewOptions;

  animation?: Animation;
  audio?: Audio;
  document?: Document;
  photo?: PhotoSize[];
  sticker?: Sticker;
  story?: Story;
  video?: Video;
  video_note?: VideoNote;
  voice?: Voice;
  caption?: string;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  has_media_spoiler?: boolean;

  contact?: Contact;
  dice?: Dice;
  game?: Game;
  poll?: Poll;
  venue?: Venue;
  location?: Location;

  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  new_chat_title?: string;
  new_chat_photo?: PhotoSize[];
  delete_chat_photo?: true;

  group_chat_created?: true;
  supergroup_chat_created?: true;
  channel_chat_created?: true;

  message_auto_delete_timer_changed?: MessageAutoDeleteTimerChanged;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: TelegramMessage;

  invoice?: Invoice;
  successful_payment?: SuccessfulPayment;
  refunded_payment?: RefundedPayment;

  users_shared?: UsersShared;
  chat_shared?: ChatShared;

  connected_website?: string;
  write_access_allowed?: WriteAccessAllowed;

  passport_data?: PassportData;
  proximity_alert_triggered?: ProximityAlertTriggered;

  video_chat_scheduled?: VideoChatScheduled;
  video_chat_started?: VideoChatStarted;
  video_chat_ended?: VideoChatEnded;
  video_chat_participants_invited?: VideoChatParticipantsInvited;

  reply_markup?: InlineKeyboardMarkup;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

// Supporting type definitions
export interface MessageEntity { [key: string]: any }
export interface MessageOrigin { [key: string]: any }
export interface ExternalReplyInfo { [key: string]: any }
export interface TextQuote { [key: string]: any }
export interface Story { [key: string]: any }
export interface LinkPreviewOptions { [key: string]: any }
export interface Animation { [key: string]: any }
export interface Audio { [key: string]: any }
export interface Document { [key: string]: any }
export interface PhotoSize { [key: string]: any }
export interface Sticker { [key: string]: any }
export interface Video { [key: string]: any }
export interface VideoNote { [key: string]: any }
export interface Voice { [key: string]: any }
export interface Contact { [key: string]: any }
export interface Dice { [key: string]: any }
export interface Game { [key: string]: any }
export interface Poll { [key: string]: any }
export interface Venue { [key: string]: any }
export interface Location { 
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}
export interface MessageAutoDeleteTimerChanged { [key: string]: any }
export interface Invoice { [key: string]: any }
export interface SuccessfulPayment { [key: string]: any }
export interface RefundedPayment { [key: string]: any }
export interface UsersShared { [key: string]: any }
export interface ChatShared { [key: string]: any }
export interface WriteAccessAllowed { [key: string]: any }
export interface PassportData { [key: string]: any }
export interface ProximityAlertTriggered { [key: string]: any }
export interface VideoChatScheduled { [key: string]: any }
export interface VideoChatStarted { [key: string]: any }
export interface VideoChatEnded { [key: string]: any }
export interface VideoChatParticipantsInvited { [key: string]: any }
export interface InlineKeyboardMarkup { [key: string]: any }