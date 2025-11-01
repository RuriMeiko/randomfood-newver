// Test the Neon client fix
import { neon } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_Ur3GEKgwmD9O@ep-soft-poetry-a18vskpw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testNeonFix() {
  console.log('🔧 Testing Neon client .query() method...');
  
  try {
    const neonClient = neon(connectionString);
    
    console.log('\n1️⃣ Testing query without params:');
    const result1 = await neonClient.query('SELECT * FROM user_aliases ORDER BY confidence DESC');
    console.log('✅ No params works:', result1.length, 'rows');
    
    console.log('\n2️⃣ Testing query with params:');
    const result2 = await neonClient.query('SELECT * FROM chat_members WHERE chat_id = $1', ['test_chat']);
    console.log('✅ With params works:', result2.length, 'rows');
    
    console.log('\n3️⃣ Testing INSERT with params:');
    const result3 = await neonClient.query(
      'INSERT INTO conversation_messages (chat_id, user_id, message_type, content, token_count) VALUES ($1, $2, $3, $4, $5)',
      ['test_chat', 'test_user', 'user', 'Test message', 10]
    );
    console.log('✅ INSERT works - affected rows:', result3.affectedRows || 'N/A');
    
    console.log('\n🎉 Neon client .query() method working correctly!');
    console.log('Bot should now work without tagged-template errors');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNeonFix();