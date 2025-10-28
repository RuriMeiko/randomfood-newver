import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';

// Sample data for seeding
const sampleMainFoods = [
  { name: 'Phở', img: 'https://example.com/pho.jpg', only: false },
  { name: 'Bún bò Huế', img: 'https://example.com/bunbo.jpg', only: false },
  { name: 'Bánh mì', img: 'https://example.com/banhmi.jpg', only: true },
  { name: 'Cơm tấm', img: 'https://example.com/comtam.jpg', only: false },
  { name: 'Bún chả', img: 'https://example.com/buncha.jpg', only: false },
];

const sampleSubFoods = [
  { name: 'Gỏi cuốn' },
  { name: 'Chả cá' },
  { name: 'Nem nướng' },
  { name: 'Bánh xèo' },
  { name: 'Chả giò' },
];

export async function seedDatabase(connectionString: string) {
  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  try {
    console.log('🌱 Starting database seeding...');

    // Seed main foods
    console.log('📦 Seeding main foods...');
    await db.insert(schema.mainfood).values(sampleMainFoods);

    // Seed sub foods
    console.log('📦 Seeding sub foods...');
    await db.insert(schema.subfood).values(sampleSubFoods);

    // Create initial credit entry
    console.log('📦 Creating initial credit entry...');
    await db.insert(schema.credit).values({
      data: {
        help: [
          '/start - Bắt đầu sử dụng bot',
          '/help - Xem hướng dẫn',
          '/randomfood - Gợi ý món ăn ngẫu nhiên',
          '/randomfoodhistory - Xem lịch sử gợi ý',
          '/debt - Xem nợ hiện tại',
          '/debtcreate - Tạo nợ mới',
          '/debtpay - Trả nợ',
          '/debthistory - Xem lịch sử nợ',
          '/image <text> - Tạo ảnh từ text',
          '/all - Tag tất cả thành viên',
          '/about - Thông tin về bot'
        ]
      }
    });

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  seedDatabase(connectionString)
    .then(() => {
      console.log('🎉 Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding script failed:', error);
      process.exit(1);
    });
}