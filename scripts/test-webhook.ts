/**
 * Test Webhook Script
 * 
 * Gọi API qua webhook để test responses với các emotion states khác nhau.
 * Script này sẽ:
 * 1. Set emotion state trong database
 * 2. Gửi tin nhắn test qua webhook
 * 3. Hiển thị response
 * 
 * Usage:
 *   npx tsx scripts/test-webhook.ts                     - Interactive mode
 *   npx tsx scripts/test-webhook.ts <preset> <message>  - Quick test
 *   npx tsx scripts/test-webhook.ts --list              - List presets
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { EMOTION_PRESETS, EmotionPreset } from './data/emotion-presets';
import { TEST_SUITES, getTestSuite } from './test-responses';

// ==========================================
// CONFIGURATION
// ==========================================

interface Config {
  webhookUrl: string;
  databaseUrl: string;
  testUserId: number;
  testChatId: number;
  testUserName: string;
}

function loadConfig(): Config {
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

  return {
    // Default webhook URL - có thể override bằng env
    webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:8787/webhook',
    databaseUrl,
    // Test user/chat IDs - có thể override
    testUserId: parseInt(process.env.TEST_USER_ID || '123456789'),
    testChatId: parseInt(process.env.TEST_CHAT_ID || '123456789'),
    testUserName: process.env.TEST_USER_NAME || 'TestUser',
  };
}

// ==========================================
// DATABASE FUNCTIONS
// ==========================================

async function setEmotionState(sql: ReturnType<typeof neon>, preset: EmotionPreset): Promise<void> {
  const emotions = EMOTION_PRESETS[preset];
  
  console.log(`\n🎭 Setting emotion state to: ${preset}`);
  
  for (const [emotion, value] of Object.entries(emotions)) {
    await sql`
      INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
      VALUES (${emotion}, ${value}, NOW())
      ON CONFLICT (emotion_name) DO UPDATE SET
        value = EXCLUDED.value,
        last_updated = EXCLUDED.last_updated
    `;
  }
  
  console.log(`✅ Emotion state set successfully`);
}

async function getCurrentEmotions(sql: ReturnType<typeof neon>): Promise<Record<string, number>> {
  const result = await sql`
    SELECT emotion_name, value::float as value 
    FROM bot_emotional_state 
    ORDER BY value DESC
  `;
  
  const emotions: Record<string, number> = {};
  for (const row of result) {
    emotions[row.emotion_name] = row.value;
  }
  return emotions;
}

// ==========================================
// WEBHOOK FUNCTIONS
// ==========================================

interface WebhookResponse {
  success: boolean;
  responseTime: number;
  error?: string;
}

async function sendWebhookMessage(
  config: Config,
  message: string
): Promise<WebhookResponse> {
  const startTime = Date.now();
  
  // Tạo Telegram message format
  const telegramUpdate = {
    update_id: Math.floor(Math.random() * 1000000000),
    message: {
      message_id: Math.floor(Math.random() * 100000),
      from: {
        id: config.testUserId,
        is_bot: false,
        first_name: config.testUserName,
        username: config.testUserName.toLowerCase(),
        language_code: 'vi',
      },
      chat: {
        id: config.testChatId,
        first_name: config.testUserName,
        username: config.testUserName.toLowerCase(),
        type: 'private',
      },
      date: Math.floor(Date.now() / 1000),
      text: message,
    },
  };

  try {
    console.log(`\n📤 Sending to webhook: ${config.webhookUrl}`);
    console.log(`💬 Message: "${message}"`);
    
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramUpdate),
    });

    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`\n📥 Response (${responseTime}ms):`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Body: ${responseText}`);

    return {
      success: response.ok,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`\n❌ Error (${responseTime}ms):`, error.message);
    
    return {
      success: false,
      responseTime,
      error: error.message,
    };
  }
}

// ==========================================
// TEST RUNNER
// ==========================================

async function runTest(
  config: Config,
  sql: ReturnType<typeof neon>,
  preset: EmotionPreset,
  message: string
): Promise<void> {
  console.log('\n' + '═'.repeat(80));
  console.log(`🧪 TEST: ${preset.toUpperCase()} - "${message}"`);
  console.log('═'.repeat(80));

  // 1. Set emotion state
  await setEmotionState(sql, preset);

  // 2. Show current emotions
  const emotions = await getCurrentEmotions(sql);
  const topEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  console.log('\n📊 Current Emotion State:');
  for (const [name, value] of topEmotions) {
    const bar = '█'.repeat(Math.floor(value * 20)) + '░'.repeat(20 - Math.floor(value * 20));
    console.log(`   ${name.padEnd(14)} [${bar}] ${(value * 100).toFixed(0)}%`);
  }

  // 3. Send webhook message
  const result = await sendWebhookMessage(config, message);

  // 4. Summary
  console.log('\n' + '─'.repeat(80));
  console.log(`📋 Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`⏱️  Response Time: ${result.responseTime}ms`);
  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
  }
}

async function runPresetSuite(
  config: Config,
  sql: ReturnType<typeof neon>,
  preset: EmotionPreset,
  interactive: boolean = false
): Promise<void> {
  const suite = getTestSuite(preset);
  if (!suite) {
    console.error(`❌ Preset not found: ${preset}`);
    return;
  }

  console.log('\n' + '╔' + '═'.repeat(78) + '╗');
  console.log(`║  🎭 TESTING PRESET: ${preset.toUpperCase().padEnd(56)} ║`);
  console.log(`║  ${suite.stateDescription.substring(0, 74).padEnd(74)} ║`);
  console.log('╚' + '═'.repeat(78) + '╝');

  // Set emotion state once
  await setEmotionState(sql, preset);

  for (let i = 0; i < suite.testCases.length; i++) {
    const tc = suite.testCases[i];
    
    console.log(`\n┌─────────────────────────────────────────────────────────────────────────────┐`);
    console.log(`│ Test ${i + 1}/${suite.testCases.length}: ${tc.description.padEnd(60)} │`);
    console.log(`├─────────────────────────────────────────────────────────────────────────────┤`);
    console.log(`│ 💬 Message: "${tc.userMessage}"`);
    console.log(`│ 🎯 Expected: ${tc.expectedTone.substring(0, 60)}...`);
    console.log(`└─────────────────────────────────────────────────────────────────────────────┘`);

    await sendWebhookMessage(config, tc.userMessage);

    if (interactive && i < suite.testCases.length - 1) {
      console.log('\n⏳ Press Enter to continue to next test...');
      await waitForEnter();
    } else {
      // Wait a bit between requests
      await sleep(1000);
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForEnter(): Promise<void> {
  return new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🧪 WEBHOOK TEST SCRIPT                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Test bot responses với các emotion states khác nhau qua webhook             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Usage:                                                                      ║
║    npx tsx scripts/test-webhook.ts                    - Interactive mode     ║
║    npx tsx scripts/test-webhook.ts <preset> <message> - Quick single test    ║
║    npx tsx scripts/test-webhook.ts <preset> --suite   - Run all test cases   ║
║    npx tsx scripts/test-webhook.ts --list             - List presets         ║
║    npx tsx scripts/test-webhook.ts --help             - Show this help       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Available Presets:                                                          ║
║    POSITIVE: happy, loving, playful                                          ║
║    NEGATIVE: sad, angry, hurt, anxious                                       ║
║    MIXED:    pouty, jealous, clingy                                          ║
║    SPECIAL:  neutral, default                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Environment Variables:                                                      ║
║    WEBHOOK_URL    - Webhook endpoint (default: http://localhost:8787/webhook)║
║    TEST_USER_ID   - Test user Telegram ID (default: 123456789)               ║
║    TEST_CHAT_ID   - Test chat ID (default: 123456789)                        ║
║    TEST_USER_NAME - Test user name (default: TestUser)                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Examples:                                                                   ║
║    npx tsx scripts/test-webhook.ts happy "em ơi"                             ║
║    npx tsx scripts/test-webhook.ts sad --suite                               ║
║    WEBHOOK_URL=https://mybot.workers.dev/webhook npx tsx scripts/test-...    ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

function listPresets(): void {
  console.log('\n📋 Available Emotion Presets:\n');
  
  for (const suite of TEST_SUITES) {
    const emotions = EMOTION_PRESETS[suite.preset];
    const topEmotion = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
    
    console.log(`  🎭 ${suite.preset.padEnd(10)} - ${suite.stateDescription}`);
    console.log(`     Top emotion: ${topEmotion[0]} (${(topEmotion[1] * 100).toFixed(0)}%)`);
    console.log(`     Test cases: ${suite.testCases.length}`);
    console.log();
  }
}

async function interactiveMode(config: Config, sql: ReturnType<typeof neon>): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve));
  };

  console.log('\n🎮 INTERACTIVE MODE');
  console.log('═'.repeat(80));
  
  while (true) {
    console.log('\n📋 Options:');
    console.log('   1. Test single message with preset');
    console.log('   2. Run full test suite for preset');
    console.log('   3. Send custom message (current emotions)');
    console.log('   4. View current emotions');
    console.log('   5. List presets');
    console.log('   6. Exit');
    
    const choice = await question('\n👉 Choose option (1-6): ');
    
    switch (choice.trim()) {
      case '1': {
        const preset = await question('🎭 Enter preset name: ') as EmotionPreset;
        if (!(preset in EMOTION_PRESETS)) {
          console.log('❌ Invalid preset');
          break;
        }
        const message = await question('💬 Enter message: ');
        await runTest(config, sql, preset, message);
        break;
      }
      
      case '2': {
        const preset = await question('🎭 Enter preset name: ') as EmotionPreset;
        if (!(preset in EMOTION_PRESETS)) {
          console.log('❌ Invalid preset');
          break;
        }
        await runPresetSuite(config, sql, preset, true);
        break;
      }
      
      case '3': {
        const message = await question('💬 Enter message: ');
        await sendWebhookMessage(config, message);
        break;
      }
      
      case '4': {
        const emotions = await getCurrentEmotions(sql);
        console.log('\n📊 Current Emotion State:');
        for (const [name, value] of Object.entries(emotions).sort((a, b) => b[1] - a[1])) {
          const bar = '█'.repeat(Math.floor(value * 20)) + '░'.repeat(20 - Math.floor(value * 20));
          console.log(`   ${name.padEnd(14)} [${bar}] ${(value * 100).toFixed(0)}%`);
        }
        break;
      }
      
      case '5':
        listPresets();
        break;
      
      case '6':
        console.log('\n👋 Bye!');
        rl.close();
        return;
      
      default:
        console.log('❌ Invalid option');
    }
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
  
  // List presets
  if (args[0] === '--list' || args[0] === '-l' || args[0] === 'list') {
    listPresets();
    return;
  }
  
  const preset = args[0] as EmotionPreset;
  
  // Validate preset
  if (!(preset in EMOTION_PRESETS)) {
    console.error(`❌ Invalid preset: ${preset}`);
    console.log('\nAvailable presets:', Object.keys(EMOTION_PRESETS).join(', '));
    console.log('\nOr use:');
    console.log('  --list    List all presets');
    console.log('  --help    Show help');
    process.exit(1);
  }
  
  // Load config after validation
  const config = loadConfig();
  const sql = neon(config.databaseUrl);
  
  console.log('🔧 Configuration:');
  console.log(`   Webhook URL: ${config.webhookUrl}`);
  console.log(`   Test User: ${config.testUserName} (ID: ${config.testUserId})`);
  console.log(`   Test Chat: ${config.testChatId}`);
  
  // Run suite
  if (args.includes('--suite') || args.includes('-s')) {
    await runPresetSuite(config, sql, preset, false);
    return;
  }
  
  // Single message test
  const message = args.slice(1).filter(a => !a.startsWith('-')).join(' ') || 'em ơi';
  await runTest(config, sql, preset, message);
}

main().catch(console.error);
