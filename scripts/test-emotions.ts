/**
 * Test Emotions Script
 * 
 * Quickly set emotional states and test bot responses.
 * Usage: npx wrangler dev --test-scheduler
 *        Then run: npx tsx scripts/test-emotions.ts <preset>
 * 
 * Or run directly: npx tsx scripts/test-emotions.ts
 */

import {
  EMOTION_PRESETS,
  EmotionPreset,
  generateSetEmotionSQL,
  generateViewEmotionSQL,
  generateResetSQL,
  PRESET_DESCRIPTIONS,
} from './data/emotion-presets';

// Re-export for backwards compatibility
export { EMOTION_PRESETS, EmotionPreset, generateSetEmotionSQL, generateViewEmotionSQL, generateResetSQL };

// Skip old emotion preset definitions - now imported from data file
const _SKIP_OLD_PRESETS = {
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

// Type and SQL generators now imported from data/emotion-presets.ts

// Skip old SQL generator definitions
const _SKIP_OLD_SQL_GENERATORS = () => {
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

// ==========================================
// CLI INTERFACE
// ==========================================

function printHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              🎭 EMOTION TEST HELPER                            ║
╠════════════════════════════════════════════════════════════════╣
║  Usage: npx tsx scripts/test-emotions.ts <command> [preset]    ║
╠════════════════════════════════════════════════════════════════╣
║  Commands:                                                     ║
║    list          - List all available presets                  ║
║    sql <preset>  - Generate SQL to set preset                  ║
║    view          - Generate SQL to view current state          ║
║    reset         - Generate SQL to reset to neutral            ║
║    describe      - Describe all presets in detail              ║
╠════════════════════════════════════════════════════════════════╣
║  Available Presets:                                            ║
║    POSITIVE: happy, loving, playful                            ║
║    NEGATIVE: sad, angry, hurt, anxious                         ║
║    MIXED:    pouty, jealous, clingy                            ║
║    SPECIAL:  neutral, default                                  ║
╚════════════════════════════════════════════════════════════════╝
`);
}

function listPresets(): void {
  console.log('\n📋 Available Emotion Presets:\n');
  
  const categories = {
    '😊 Positive': ['happy', 'loving', 'playful'],
    '😢 Negative': ['sad', 'angry', 'hurt', 'anxious'],
    '🎭 Mixed': ['pouty', 'jealous', 'clingy'],
    '⚙️ Special': ['neutral', 'default'],
  };

  for (const [category, presets] of Object.entries(categories)) {
    console.log(`${category}:`);
    for (const preset of presets) {
      const emotions = EMOTION_PRESETS[preset as EmotionPreset];
      const topEmotions = Object.entries(emotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`)
        .join(', ');
      console.log(`  • ${preset.padEnd(10)} → ${topEmotions}`);
    }
    console.log();
  }
}

function describePresets(): void {
  console.log('\n📖 Detailed Preset Descriptions:\n');
  
  const descriptions = PRESET_DESCRIPTIONS;

  for (const [preset, description] of Object.entries(descriptions)) {
    const emotions = EMOTION_PRESETS[preset as EmotionPreset];
    console.log(`\n🎭 ${preset.toUpperCase()}`);
    console.log(`   ${description}`);
    console.log('   Top emotions:');
    
    Object.entries(emotions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([emotion, value]) => {
        const bar = '█'.repeat(Math.floor(value * 10)) + '░'.repeat(10 - Math.floor(value * 10));
        console.log(`     ${emotion.padEnd(12)} [${bar}] ${(value * 100).toFixed(0)}%`);
      });
  }
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const preset = args[1] as EmotionPreset;

switch (command) {
  case 'list':
    listPresets();
    break;
    
  case 'sql':
    if (!preset || !(preset in EMOTION_PRESETS)) {
      console.error(`❌ Invalid preset: ${preset}`);
      console.log('Available presets:', Object.keys(EMOTION_PRESETS).join(', '));
      process.exit(1);
    }
    console.log(`\n-- Setting emotions to: ${preset}\n`);
    console.log(generateSetEmotionSQL(preset));
    break;
    
  case 'view':
    console.log(generateViewEmotionSQL());
    break;
    
  case 'reset':
    console.log('\n-- Resetting emotions to neutral\n');
    console.log(generateResetSQL());
    break;
    
  case 'describe':
    describePresets();
    break;
    
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
    
  default:
    printHelp();
}
