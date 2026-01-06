/**
 * Set Emotion Script
 * 
 * Set emotion state trong database để test thực tế với Telegram bot.
 * Không gửi webhook - chỉ update database.
 * 
 * Usage:
 *   npx tsx scripts/set-emotion.ts <preset>
 *   npx tsx scripts/set-emotion.ts happy
 *   npx tsx scripts/set-emotion.ts sad
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { EMOTION_PRESETS, EmotionPreset, PRESET_DESCRIPTIONS } from './data/emotion-presets';

// ==========================================
// LOAD CONFIG
// ==========================================

function loadDatabaseUrl(): string {
  // Load từ .dev.vars
  const devVarsPath = path.join(process.cwd(), '.dev.vars');
  let databaseUrl = process.env.NEON_DATABASE_URL || '';
  
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf-8');
    const match = content.match(/NEON_DATABASE_URL=(.+)/);
    if (match) {
      databaseUrl = match[1].trim();
    }
  }

  if (!databaseUrl) {
    console.error('❌ NEON_DATABASE_URL not found in .dev.vars or environment');
    process.exit(1);
  }

  return databaseUrl;
}

// ==========================================
// SET EMOTION
// ==========================================

async function setEmotionState(sql: ReturnType<typeof neon>, preset: EmotionPreset): Promise<void> {
  const emotions = EMOTION_PRESETS[preset];
  
  console.log(`\n🎭 Setting emotion state to: ${preset.toUpperCase()}`);
  console.log(`📝 Description: ${PRESET_DESCRIPTIONS[preset]}`);
  console.log();
  
  for (const [emotion, value] of Object.entries(emotions)) {
    await sql`
      INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
      VALUES (${emotion}, ${value}, NOW())
      ON CONFLICT (emotion_name) DO UPDATE SET
        value = EXCLUDED.value,
        last_updated = EXCLUDED.last_updated
    `;
  }
  
  console.log(`✅ Emotion state set successfully\n`);
}

async function showCurrentState(sql: ReturnType<typeof neon>): Promise<void> {
  const result = await sql`
    SELECT emotion_name, value::float as value 
    FROM bot_emotional_state 
    ORDER BY value DESC
  `;
  
  console.log('📊 Current Emotion State:');
  for (const row of result.slice(0, 5)) {
    const value = row.value as number;
    const bar = '█'.repeat(Math.floor(value * 20)) + '░'.repeat(20 - Math.floor(value * 20));
    console.log(`   ${row.emotion_name.padEnd(14)} [${bar}] ${(value * 100).toFixed(0)}%`);
  }
  console.log();
}

// ==========================================
// HELP
// ==========================================

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🎭 SET EMOTION STATE                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Set emotion state trong database để test với Telegram bot thực tế          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Usage:                                                                      ║
║    npx tsx scripts/set-emotion.ts <preset>                                   ║
║    npx tsx scripts/set-emotion.ts happy                                      ║
║    npx tsx scripts/set-emotion.ts sad                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Available Presets:                                                          ║
║    POSITIVE: happy, loving, playful                                          ║
║    NEGATIVE: sad, angry, hurt, anxious                                       ║
║    MIXED:    pouty, jealous, clingy                                          ║
║    SPECIAL:  neutral, default                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Quick Commands (package.json):                                              ║
║    npm run emotion:happy                                                     ║
║    npm run emotion:sad                                                       ║
║    npm run emotion:angry                                                     ║
║    npm run emotion:hurt                                                      ║
║    ... etc                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

function listPresets(): void {
  console.log('\n📋 Available Emotion Presets:\n');
  
  for (const [preset, description] of Object.entries(PRESET_DESCRIPTIONS)) {
    const emotions = EMOTION_PRESETS[preset as EmotionPreset];
    const topEmotion = Object.entries(emotions)
      .sort((a, b) => b[1] - a[1])[0];
    
    console.log(`  🎭 ${preset.padEnd(10)} - ${description}`);
    console.log(`     Top: ${topEmotion[0]} (${(topEmotion[1] * 100).toFixed(0)}%)`);
    console.log();
  }
}

// ==========================================
// MAIN
// ==========================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Help
  if (args.length === 0 || args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    printHelp();
    return;
  }
  
  // List
  if (args[0] === '--list' || args[0] === '-l' || args[0] === 'list') {
    listPresets();
    return;
  }
  
  const preset = args[0] as EmotionPreset;
  
  // Validate
  if (!(preset in EMOTION_PRESETS)) {
    console.error(`❌ Invalid preset: ${preset}`);
    console.log('\nAvailable presets:', Object.keys(EMOTION_PRESETS).join(', '));
    console.log('\nUse --list to see all presets with descriptions');
    process.exit(1);
  }
  
  // Load DB
  const databaseUrl = loadDatabaseUrl();
  const sql = neon(databaseUrl);
  
  // Set emotion
  await setEmotionState(sql, preset);
  
  // Show current state
  await showCurrentState(sql);
  
  console.log('✅ Done! Giờ bạn có thể nhắn tin với bot qua Telegram để test.');
  console.log();
}

main().catch(console.error);
