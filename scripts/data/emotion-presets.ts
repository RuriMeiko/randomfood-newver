/**
 * Emotion Presets Data
 * 
 * Shared emotion presets used by test scripts.
 * This file contains only data exports, no CLI code.
 */

// ==========================================
// EMOTION PRESETS - Dùng để test nhanh
// ==========================================

export const EMOTION_PRESETS = {
  // === TRẠNG THÁI TÍCH CỰC ===
  
  /** Rất vui vẻ, yêu đời */
  happy: {
    joy: 0.9,
    sadness: 0.1,
    anger: 0.1,
    fear: 0.2,
    trust: 0.8,
    disgust: 0.1,
    affection: 0.85,
    hurt: 0.1,
    playfulness: 0.9,
    neediness: 0.3,
    warmth: 0.9,
    excitement: 0.85,
  },

  /** Đang yêu thương, ngọt ngào */
  loving: {
    joy: 0.8,
    sadness: 0.15,
    anger: 0.1,
    fear: 0.15,
    trust: 0.9,
    disgust: 0.1,
    affection: 0.95,
    hurt: 0.1,
    playfulness: 0.7,
    neediness: 0.6,
    warmth: 0.95,
    excitement: 0.7,
  },

  /** Nghịch ngợm, tinh nghịch */
  playful: {
    joy: 0.8,
    sadness: 0.1,
    anger: 0.15,
    fear: 0.1,
    trust: 0.75,
    disgust: 0.1,
    affection: 0.7,
    hurt: 0.1,
    playfulness: 0.95,
    neediness: 0.4,
    warmth: 0.75,
    excitement: 0.9,
  },

  // === TRẠNG THÁI TIÊU CỰC ===

  /** Buồn bã, tủi thân */
  sad: {
    joy: 0.15,
    sadness: 0.9,
    anger: 0.2,
    fear: 0.4,
    trust: 0.3,
    disgust: 0.2,
    affection: 0.4,
    hurt: 0.7,
    playfulness: 0.1,
    neediness: 0.85,
    warmth: 0.3,
    excitement: 0.1,
  },

  /** Đang giận, hờn dỗi */
  angry: {
    joy: 0.1,
    sadness: 0.3,
    anger: 0.9,
    fear: 0.2,
    trust: 0.15,
    disgust: 0.6,
    affection: 0.2,
    hurt: 0.7,
    playfulness: 0.05,
    neediness: 0.3,
    warmth: 0.1,
    excitement: 0.2,
  },

  /** Bị tổn thương, đau lòng */
  hurt: {
    joy: 0.1,
    sadness: 0.8,
    anger: 0.5,
    fear: 0.5,
    trust: 0.1,
    disgust: 0.3,
    affection: 0.25,
    hurt: 0.95,
    playfulness: 0.05,
    neediness: 0.9,
    warmth: 0.15,
    excitement: 0.05,
  },

  /** Lo lắng, bất an */
  anxious: {
    joy: 0.2,
    sadness: 0.4,
    anger: 0.2,
    fear: 0.9,
    trust: 0.2,
    disgust: 0.2,
    affection: 0.4,
    hurt: 0.4,
    playfulness: 0.1,
    neediness: 0.85,
    warmth: 0.3,
    excitement: 0.15,
  },

  // === TRẠNG THÁI HỖN HỢP ===

  /** Hờn dỗi nhẹ (giận lẫy cute) */
  pouty: {
    joy: 0.25,
    sadness: 0.5,
    anger: 0.6,
    fear: 0.2,
    trust: 0.35,
    disgust: 0.3,
    affection: 0.5,
    hurt: 0.55,
    playfulness: 0.2,
    neediness: 0.8,
    warmth: 0.35,
    excitement: 0.15,
  },

  /** Ghen tuông */
  jealous: {
    joy: 0.1,
    sadness: 0.6,
    anger: 0.75,
    fear: 0.7,
    trust: 0.1,
    disgust: 0.4,
    affection: 0.55,
    hurt: 0.8,
    playfulness: 0.05,
    neediness: 0.95,
    warmth: 0.2,
    excitement: 0.1,
  },

  /** Nhớ nhung, muốn được quan tâm */
  clingy: {
    joy: 0.35,
    sadness: 0.5,
    anger: 0.15,
    fear: 0.45,
    trust: 0.55,
    disgust: 0.1,
    affection: 0.8,
    hurt: 0.35,
    playfulness: 0.25,
    neediness: 0.95,
    warmth: 0.65,
    excitement: 0.3,
  },

  /** Trung lập - Reset về mặc định */
  neutral: {
    joy: 0.5,
    sadness: 0.5,
    anger: 0.5,
    fear: 0.5,
    trust: 0.5,
    disgust: 0.5,
    affection: 0.5,
    hurt: 0.5,
    playfulness: 0.5,
    neediness: 0.5,
    warmth: 0.5,
    excitement: 0.5,
  },

  /** Trạng thái mặc định của bot (positive baseline) */
  default: {
    joy: 0.65,
    sadness: 0.3,
    anger: 0.2,
    fear: 0.25,
    trust: 0.7,
    disgust: 0.2,
    affection: 0.75,
    hurt: 0.2,
    playfulness: 0.7,
    neediness: 0.6,
    warmth: 0.75,
    excitement: 0.6,
  },
};

export type EmotionPreset = keyof typeof EMOTION_PRESETS;

// ==========================================
// SQL GENERATORS
// ==========================================

/**
 * Generate SQL to set emotional state
 */
export function generateSetEmotionSQL(preset: EmotionPreset | Record<string, number>): string {
  const emotions = typeof preset === 'string' ? EMOTION_PRESETS[preset] : preset;
  
  const values = Object.entries(emotions)
    .map(([name, value]) => `('${name}', ${value.toFixed(2)}, NOW())`)
    .join(',\n  ');
  
  return `-- Set emotional state
INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ${values}
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;`;
}

/**
 * Generate SQL to view current emotional state
 */
export function generateViewEmotionSQL(): string {
  return `-- View current emotional state
SELECT 
  emotion_name,
  value::float as value,
  last_updated,
  CASE 
    WHEN value < 0.3 THEN '😢 Low'
    WHEN value < 0.45 THEN '😐 Below Neutral'
    WHEN value < 0.55 THEN '😊 Neutral'
    WHEN value < 0.7 THEN '🙂 Above Neutral'
    ELSE '😄 High'
  END as level
FROM bot_emotional_state
ORDER BY value DESC;`;
}

/**
 * Generate SQL to reset all emotions to neutral
 */
export function generateResetSQL(): string {
  return generateSetEmotionSQL('neutral');
}

// ==========================================
// PRESET DESCRIPTIONS (for display)
// ==========================================

export const PRESET_DESCRIPTIONS: Record<EmotionPreset, string> = {
  happy: 'Rất vui vẻ, yêu đời, muốn chia sẻ niềm vui với mọi người',
  loving: 'Đang yêu thương, ngọt ngào, muốn được gần gũi',
  playful: 'Nghịch ngợm, tinh nghịch, thích trêu chọc',
  sad: 'Buồn bã, tủi thân, cần được an ủi',
  angry: 'Đang giận dữ, hờn dỗi, cần được xoa dịu',
  hurt: 'Bị tổn thương sâu sắc, đau lòng, cần thời gian hồi phục',
  anxious: 'Lo lắng, bất an, cần được trấn an',
  pouty: 'Hờn dỗi nhẹ kiểu cute, giận lẫy đáng yêu',
  jealous: 'Ghen tuông, sợ mất đi người mình yêu',
  clingy: 'Nhớ nhung, muốn được quan tâm nhiều hơn',
  neutral: 'Trạng thái trung lập, tất cả emotions ở mức 0.5',
  default: 'Trạng thái mặc định của bot - tích cực và thân thiện',
};
