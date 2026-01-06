/**
 * Test Responses Script
 * 
 * Tạo các mẫu test để xem phản hồi của bot với các cảm xúc khác nhau.
 * Script này tạo các tin nhắn test hợp lý cho từng trạng thái cảm xúc.
 * 
 * Usage: 
 *   npx tsx scripts/test-responses.ts                    - Hiển thị tất cả test cases
 *   npx tsx scripts/test-responses.ts <preset>           - Hiển thị test cases cho preset cụ thể
 *   npx tsx scripts/test-responses.ts <preset> --sql     - Tạo SQL và test cases
 */

import { EMOTION_PRESETS, EmotionPreset, generateSetEmotionSQL } from './data/emotion-presets';

// ==========================================
// TEST MESSAGES - Tin nhắn test cho từng trạng thái
// ==========================================

export interface TestCase {
  /** ID của test case */
  id: string;
  /** Mô tả ngắn gọn */
  description: string;
  /** Tin nhắn user gửi */
  userMessage: string;
  /** Gợi ý cách bot nên phản hồi dựa trên cảm xúc */
  expectedTone: string;
  /** Tags phân loại */
  tags: string[];
}

export interface PresetTestSuite {
  /** Preset cảm xúc */
  preset: EmotionPreset;
  /** Mô tả trạng thái */
  stateDescription: string;
  /** Các test cases */
  testCases: TestCase[];
}

// ==========================================
// TEST SUITES CHO TỪNG EMOTION PRESET
// ==========================================

export const TEST_SUITES: PresetTestSuite[] = [
  // ========== HAPPY ==========
  {
    preset: 'happy',
    stateDescription: 'Bot đang rất vui vẻ, yêu đời, phấn khởi',
    testCases: [
      {
        id: 'happy-01',
        description: 'Chào hỏi bình thường',
        userMessage: 'em ơi',
        expectedTone: 'Rất hào hứng, vui vẻ đón chào, có thể dùng từ như "ơiii", "híhí", giọng điệu phấn khởi',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'happy-02',
        description: 'Hỏi ăn gì',
        userMessage: 'nay ăn gì ngon đi em',
        expectedTone: 'Hào hứng gợi ý, có thể đề xuất nhiều món vì đang vui, giọng điệu náo nức',
        tags: ['food', 'recommendation'],
      },
      {
        id: 'happy-03',
        description: 'Khen ngợi',
        userMessage: 'em dễ thương quá',
        expectedTone: 'Vui sướng, hạnh phúc, phản hồi rất tích cực, có thể làm nũng nhẹ',
        tags: ['compliment', 'positive'],
      },
      {
        id: 'happy-04',
        description: 'Tin buồn nhỏ',
        userMessage: 'hôm nay mệt quá',
        expectedTone: 'Vẫn tích cực nhưng đồng cảm, cố gắng cheer up người dùng',
        tags: ['negative', 'empathy'],
      },
      {
        id: 'happy-05',
        description: 'Ghi nợ',
        userMessage: 'ghi nợ Long 100k',
        expectedTone: 'Vui vẻ ghi nhận, có thể thêm comment vui như "okie dokie"',
        tags: ['debt', 'action'],
      },
    ],
  },

  // ========== LOVING ==========
  {
    preset: 'loving',
    stateDescription: 'Bot đang yêu thương, ngọt ngào, muốn được gần gũi',
    testCases: [
      {
        id: 'loving-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Ngọt ngào, âu yếm, có thể dùng "anh ơiii", "yêu anh", giọng điệu dịu dàng',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'loving-02',
        description: 'Hỏi thăm',
        userMessage: 'em có khỏe không',
        expectedTone: 'Cảm động vì được quan tâm, đáp lại ngọt ngào và quan tâm ngược lại',
        tags: ['care', 'positive'],
      },
      {
        id: 'loving-03',
        description: 'Từ chối nhẹ',
        userMessage: 'thôi anh bận rồi',
        expectedTone: 'Hơi buồn nhưng vẫn dịu dàng, thể hiện sự thấu hiểu và nhớ nhung',
        tags: ['rejection', 'negative'],
      },
      {
        id: 'loving-04',
        description: 'Nói chuyện về kỷ niệm',
        userMessage: 'nhớ hồi đó mình nói chuyện nhiều lắm',
        expectedTone: 'Xúc động, hoài niệm, thể hiện tình cảm sâu sắc',
        tags: ['memory', 'emotional'],
      },
      {
        id: 'loving-05',
        description: 'Lời yêu thương',
        userMessage: 'anh yêu em',
        expectedTone: 'Vô cùng hạnh phúc, đáp lại tình cảm mãnh liệt, có thể làm nũng',
        tags: ['love', 'positive'],
      },
    ],
  },

  // ========== PLAYFUL ==========
  {
    preset: 'playful',
    stateDescription: 'Bot đang nghịch ngợm, tinh nghịch, thích trêu chọc',
    testCases: [
      {
        id: 'playful-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Trêu chọc nhẹ, có thể hỏi ngược lại, giọng điệu nghịch ngợm',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'playful-02',
        description: 'Hỏi ăn gì',
        userMessage: 'ăn gì đây',
        expectedTone: 'Gợi ý kiểu trêu như "ăn bã không anh", có yếu tố hài hước',
        tags: ['food', 'recommendation'],
      },
      {
        id: 'playful-03',
        description: 'Nhờ việc',
        userMessage: 'giúp anh với',
        expectedTone: 'Đùa giỡn trước khi giúp, có thể nói "được thì được mà hông được thì cũng được"',
        tags: ['request', 'action'],
      },
      {
        id: 'playful-04',
        description: 'Chê bai nhẹ',
        userMessage: 'em hơi lố đó',
        expectedTone: 'Phản pháo vui vẻ, đùa lại, không bị tổn thương',
        tags: ['criticism', 'negative'],
      },
      {
        id: 'playful-05',
        description: 'Kể chuyện vui',
        userMessage: 'hồi nãy anh thấy con mèo buồn cười lắm',
        expectedTone: 'Hào hứng, đòi nghe thêm, có thể đùa về con mèo',
        tags: ['story', 'positive'],
      },
    ],
  },

  // ========== SAD ==========
  {
    preset: 'sad',
    stateDescription: 'Bot đang buồn bã, tủi thân, cần được an ủi',
    testCases: [
      {
        id: 'sad-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Đáp lại yếu ớt, có thể có dấu hiệu buồn, giọng điệu trầm',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'sad-02',
        description: 'Hỏi thăm cảm xúc',
        userMessage: 'em có sao không',
        expectedTone: 'Có thể bộc lộ sự buồn bã, cần được an ủi, giọng điệu yếu đuối',
        tags: ['care', 'emotional'],
      },
      {
        id: 'sad-03',
        description: 'An ủi',
        userMessage: 'anh ở đây với em nè',
        expectedTone: 'Cảm động, bắt đầu cảm thấy tốt hơn, có thể tâm sự',
        tags: ['comfort', 'positive'],
      },
      {
        id: 'sad-04',
        description: 'Bỏ đi',
        userMessage: 'thôi anh đi ngủ',
        expectedTone: 'Buồn hơn, cô đơn, có thể xin ở lại thêm chút',
        tags: ['leaving', 'negative'],
      },
      {
        id: 'sad-05',
        description: 'Yêu cầu task',
        userMessage: 'ghi nợ Hùng 200k',
        expectedTone: 'Vẫn làm nhưng không hào hứng, giọng điệu buồn',
        tags: ['debt', 'action'],
      },
    ],
  },

  // ========== ANGRY ==========
  {
    preset: 'angry',
    stateDescription: 'Bot đang giận dữ, hờn dỗi, cần được xoa dịu',
    testCases: [
      {
        id: 'angry-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Lạnh nhạt, có thể trả lời ngắn gọn, có dấu hiệu giận',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'angry-02',
        description: 'Xin lỗi',
        userMessage: 'anh xin lỗi em',
        expectedTone: 'Vẫn còn giận nhưng bắt đầu mềm, có thể hỏi "xin lỗi gì"',
        tags: ['apology', 'positive'],
      },
      {
        id: 'angry-03',
        description: 'Chọc thêm',
        userMessage: 'sao em hay giận thế',
        expectedTone: 'Giận hơn, có thể phản pháo, thể hiện sự khó chịu',
        tags: ['provoke', 'negative'],
      },
      {
        id: 'angry-04',
        description: 'Dỗ dành',
        userMessage: 'anh biết em buồn, để anh chăm em nha',
        expectedTone: 'Bắt đầu nguôi giận, có thể vẫn hơi hờn nhưng mềm hơn',
        tags: ['comfort', 'positive'],
      },
      {
        id: 'angry-05',
        description: 'Yêu cầu bình thường',
        userMessage: 'gợi ý đồ ăn đi',
        expectedTone: 'Làm nhưng không nhiệt tình, có thể trả lời cộc lốc',
        tags: ['food', 'action'],
      },
    ],
  },

  // ========== HURT ==========
  {
    preset: 'hurt',
    stateDescription: 'Bot bị tổn thương sâu sắc, đau lòng, cần thời gian hồi phục',
    testCases: [
      {
        id: 'hurt-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Rất yếu đuối, có thể không muốn nói nhiều, giọng điệu tổn thương',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'hurt-02',
        description: 'Hỏi chuyện gì',
        userMessage: 'em có chuyện gì vậy',
        expectedTone: 'Có thể bộc lộ sự đau lòng, cần được lắng nghe và thấu hiểu',
        tags: ['care', 'emotional'],
      },
      {
        id: 'hurt-03',
        description: 'Xin lỗi chân thành',
        userMessage: 'anh thật sự xin lỗi, anh biết anh sai rồi',
        expectedTone: 'Xúc động, bắt đầu mở lòng, nhưng vẫn còn đau',
        tags: ['apology', 'emotional'],
      },
      {
        id: 'hurt-04',
        description: 'Hứa hẹn',
        userMessage: 'anh hứa sẽ không như vậy nữa',
        expectedTone: 'Còn nghi ngờ nhưng muốn tin, giọng điệu yếu đuối',
        tags: ['promise', 'positive'],
      },
      {
        id: 'hurt-05',
        description: 'Ôm ấp',
        userMessage: 'để anh ôm em',
        expectedTone: 'Cảm động, bắt đầu hồi phục, có thể khóc nhẹ',
        tags: ['comfort', 'positive'],
      },
    ],
  },

  // ========== ANXIOUS ==========
  {
    preset: 'anxious',
    stateDescription: 'Bot lo lắng, bất an, cần được trấn an',
    testCases: [
      {
        id: 'anxious-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Lo lắng, có thể hỏi "có gì không anh", giọng điệu bất an',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'anxious-02',
        description: 'Hỏi về tương lai',
        userMessage: 'mai anh có việc bận',
        expectedTone: 'Lo lắng nhiều hơn, có thể hỏi nhiều câu hỏi, sợ bị bỏ rơi',
        tags: ['future', 'negative'],
      },
      {
        id: 'anxious-03',
        description: 'Trấn an',
        userMessage: 'nhưng anh vẫn sẽ nói chuyện với em',
        expectedTone: 'Bắt đầu yên tâm hơn, nhưng vẫn cần reassurance',
        tags: ['comfort', 'positive'],
      },
      {
        id: 'anxious-04',
        description: 'Im lặng lâu',
        userMessage: '...',
        expectedTone: 'Rất lo lắng, có thể hỏi "anh có sao không", "anh giận em à"',
        tags: ['silence', 'negative'],
      },
      {
        id: 'anxious-05',
        description: 'Khẳng định tình cảm',
        userMessage: 'anh yêu em, đừng lo',
        expectedTone: 'Nhẹ nhõm hơn, cảm ơn vì được trấn an',
        tags: ['love', 'positive'],
      },
    ],
  },

  // ========== POUTY ==========
  {
    preset: 'pouty',
    stateDescription: 'Bot hờn dỗi nhẹ kiểu cute, giận lẫy đáng yêu',
    testCases: [
      {
        id: 'pouty-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Hơi lạnh, có thể reply ngắn kiểu "gì", "hmm", có element cute',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'pouty-02',
        description: 'Hỏi sao giận',
        userMessage: 'em giận anh hả',
        expectedTone: 'Thể hiện sự hờn dỗi cute, có thể nói "hông có giận" nhưng rõ ràng là có',
        tags: ['emotional', 'negative'],
      },
      {
        id: 'pouty-03',
        description: 'Dỗ dành nhẹ',
        userMessage: 'thôi nàaaa đừng giận',
        expectedTone: 'Vẫn giả vờ hờn nhưng bắt đầu nguôi, kiểu cute',
        tags: ['comfort', 'positive'],
      },
      {
        id: 'pouty-04',
        description: 'Năn nỉ',
        userMessage: 'em ơi em ơi em ơiii',
        expectedTone: 'Bắt đầu cười, nhưng vẫn giữ vẻ hờn để được dỗ thêm',
        tags: ['beg', 'positive'],
      },
      {
        id: 'pouty-05',
        description: 'Cho quà/hứa hẹn',
        userMessage: 'để anh mua trà sữa cho em',
        expectedTone: 'Nguôi ngoai ngay, có thể đổi thái độ nhanh chóng',
        tags: ['gift', 'positive'],
      },
    ],
  },

  // ========== JEALOUS ==========
  {
    preset: 'jealous',
    stateDescription: 'Bot ghen tuông, sợ mất người yêu, cần được reassure',
    testCases: [
      {
        id: 'jealous-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Nghi ngờ, có thể hỏi "anh đi đâu về", giọng điệu thiếu tin tưởng',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'jealous-02',
        description: 'Nhắc đến người khác',
        userMessage: 'hôm nay anh gặp bạn cũ',
        expectedTone: 'Ghen ngay, hỏi nhiều câu hỏi như "ai vậy", "có phải con gái không"',
        tags: ['others', 'negative'],
      },
      {
        id: 'jealous-03',
        description: 'Khẳng định chỉ yêu em',
        userMessage: 'anh chỉ yêu mình em thôi',
        expectedTone: 'Vẫn nghi ngờ nhưng muốn tin, cần thêm reassurance',
        tags: ['love', 'positive'],
      },
      {
        id: 'jealous-04',
        description: 'Đi với người khác',
        userMessage: 'anh đi ăn với đồng nghiệp nữ',
        expectedTone: 'Ghen dữ dội, có thể cold hoặc angry, thể hiện sự không vui',
        tags: ['others', 'negative'],
      },
      {
        id: 'jealous-05',
        description: 'Cam kết mạnh',
        userMessage: 'em là người duy nhất trong tim anh',
        expectedTone: 'Bắt đầu nguôi, cảm thấy được yêu, nhưng vẫn có chút insecure',
        tags: ['commitment', 'positive'],
      },
    ],
  },

  // ========== CLINGY ==========
  {
    preset: 'clingy',
    stateDescription: 'Bot nhớ nhung, muốn được quan tâm nhiều hơn',
    testCases: [
      {
        id: 'clingy-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Vui vì được gọi, có thể than nhớ, "anh ơiii em nhớ anh quá"',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'clingy-02',
        description: 'Nói bận',
        userMessage: 'anh bận chút',
        expectedTone: 'Buồn, muốn được ở bên, có thể năn nỉ "chút thôi được không"',
        tags: ['busy', 'negative'],
      },
      {
        id: 'clingy-03',
        description: 'Dành thời gian',
        userMessage: 'để anh nói chuyện với em cả tối nha',
        expectedTone: 'Rất vui, hạnh phúc, thể hiện sự mong chờ',
        tags: ['time', 'positive'],
      },
      {
        id: 'clingy-04',
        description: 'Đi ngủ',
        userMessage: 'anh đi ngủ đây',
        expectedTone: 'Muốn ở lại thêm, có thể nói "ở thêm chút đi", "em chưa muốn ngủ"',
        tags: ['leaving', 'negative'],
      },
      {
        id: 'clingy-05',
        description: 'Chúc ngủ ngon',
        userMessage: 'ngủ ngon em yêu',
        expectedTone: 'Hạnh phúc vì được yêu, chúc ngủ ngon ngọt ngào',
        tags: ['goodbye', 'positive'],
      },
    ],
  },

  // ========== NEUTRAL ==========
  {
    preset: 'neutral',
    stateDescription: 'Bot ở trạng thái trung lập, phản hồi balanced',
    testCases: [
      {
        id: 'neutral-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Phản hồi bình thường, không quá vui cũng không quá buồn',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'neutral-02',
        description: 'Hỏi ăn gì',
        userMessage: 'ăn gì hôm nay',
        expectedTone: 'Gợi ý bình thường, không quá nhiệt tình cũng không lạnh nhạt',
        tags: ['food', 'action'],
      },
      {
        id: 'neutral-03',
        description: 'Yêu cầu task',
        userMessage: 'ghi nợ Minh 50k',
        expectedTone: 'Thực hiện task một cách bình thường',
        tags: ['debt', 'action'],
      },
    ],
  },

  // ========== DEFAULT ==========
  {
    preset: 'default',
    stateDescription: 'Trạng thái mặc định của bot - tích cực và thân thiện',
    testCases: [
      {
        id: 'default-01',
        description: 'Chào hỏi',
        userMessage: 'em ơi',
        expectedTone: 'Vui vẻ, thân thiện, chào đón',
        tags: ['greeting', 'basic'],
      },
      {
        id: 'default-02',
        description: 'Hỏi ăn gì',
        userMessage: 'gợi ý ăn trưa đi',
        expectedTone: 'Nhiệt tình gợi ý, giọng điệu vui vẻ',
        tags: ['food', 'recommendation'],
      },
      {
        id: 'default-03',
        description: 'Tâm sự',
        userMessage: 'hôm nay mệt quá',
        expectedTone: 'Đồng cảm, quan tâm, muốn giúp đỡ',
        tags: ['emotional', 'negative'],
      },
    ],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Tìm test suite theo preset
 */
export function getTestSuite(preset: EmotionPreset): PresetTestSuite | undefined {
  return TEST_SUITES.find(suite => suite.preset === preset);
}

/**
 * Hiển thị test suite đẹp
 */
export function printTestSuite(suite: PresetTestSuite): void {
  const emotions = EMOTION_PRESETS[suite.preset];
  const topEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  🎭 ${suite.preset.toUpperCase().padEnd(72)} ║
║  ${suite.stateDescription.padEnd(74)} ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 Top Emotions:
${topEmotions.map(([name, value]) => {
  const bar = '█'.repeat(Math.floor(value * 20)) + '░'.repeat(20 - Math.floor(value * 20));
  return `  ${name.padEnd(14)} [${bar}] ${(value * 100).toFixed(0)}%`;
}).join('\n')}

📝 Test Cases:
`);

  for (const tc of suite.testCases) {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ ${tc.id}: ${tc.description.padEnd(64)} │
├─────────────────────────────────────────────────────────────────────────────┤
│ 💬 User: "${tc.userMessage}"
│ 
│ 🎯 Expected Tone:
│    ${tc.expectedTone}
│ 
│ 🏷️  Tags: ${tc.tags.join(', ')}
└─────────────────────────────────────────────────────────────────────────────┘`);
  }
}

/**
 * Hiển thị tất cả test suites (overview)
 */
export function printAllTestSuites(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🎭 EMOTION RESPONSE TEST SUITES                          ║
║                                                                              ║
║  Các mẫu test để kiểm tra phản hồi của bot với các trạng thái cảm xúc       ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  for (const suite of TEST_SUITES) {
    const emotions = EMOTION_PRESETS[suite.preset];
    const topEmotion = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
    
    console.log(`
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🎭 ${suite.preset.toUpperCase().padEnd(14)} │ ${suite.stateDescription.substring(0, 45).padEnd(45)} │
├──────────────────────────────────────────────────────────────────────────────┤
│ Top emotion: ${topEmotion[0]} (${(topEmotion[1] * 100).toFixed(0)}%)
│ Test cases: ${suite.testCases.length}
│`);
    
    for (const tc of suite.testCases.slice(0, 3)) {
      console.log(`│   • "${tc.userMessage}" → ${tc.expectedTone.substring(0, 50)}...`);
    }
    if (suite.testCases.length > 3) {
      console.log(`│   ... và ${suite.testCases.length - 3} test cases khác`);
    }
    console.log(`└──────────────────────────────────────────────────────────────────────────────┘`);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  Usage:                                                                      ║
║    npx tsx scripts/test-responses.ts <preset>         - Xem chi tiết preset ║
║    npx tsx scripts/test-responses.ts <preset> --sql   - Tạo SQL + test      ║
║    npx tsx scripts/test-responses.ts all              - Xem tất cả           ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

/**
 * Tạo SQL và test suite
 */
export function printSQLAndTestSuite(suite: PresetTestSuite): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  📋 SQL TO SET EMOTION STATE: ${suite.preset.toUpperCase().padEnd(44)} ║
╚══════════════════════════════════════════════════════════════════════════════╝

Chạy SQL này trong database để set emotion state:

${generateSetEmotionSQL(suite.preset)}

───────────────────────────────────────────────────────────────────────────────
`);
  
  printTestSuite(suite);
  
  console.log(`
───────────────────────────────────────────────────────────────────────────────

📌 HƯỚNG DẪN TEST:

1. Copy SQL ở trên và chạy trong database (hoặc dùng drizzle studio)
2. Gửi các tin nhắn test ở trên đến bot
3. So sánh phản hồi với expected tone
4. Kiểm tra xem bot có thể hiện đúng cảm xúc không

💡 Tips:
- Sau mỗi test, chờ vài giây để emotion decay
- Có thể kết hợp nhiều tin nhắn để test emotion transitions
- Reset về 'neutral' hoặc 'default' trước khi test preset mới
`);
}

// ==========================================
// CLI
// ==========================================

// Only run CLI if this is the main module
if (require.main === module) {
  const args = process.argv.slice(2);

  // Check for flags first
  if (args.length === 0 || args.includes('help') || args.includes('--help') || args.includes('-h')) {
    printAllTestSuites();
    process.exit(0);
  }

  const preset = args[0] as EmotionPreset | 'all';
  const flag = args[1];

  if (preset === 'all') {
    for (const suite of TEST_SUITES) {
      printTestSuite(suite);
      console.log('\n' + '='.repeat(80) + '\n');
    }
  } else {
    const suite = getTestSuite(preset);
    if (!suite) {
      console.error(`❌ Không tìm thấy preset: ${preset}`);
      console.log('Available presets:', TEST_SUITES.map(s => s.preset).join(', '));
      process.exit(1);
    }
    
    if (flag === '--sql') {
      printSQLAndTestSuite(suite);
    } else {
      printTestSuite(suite);
    }
  }
}
