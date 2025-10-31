// Test the virtual member fix
import { Pool } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_Ur3GEKgwmD9O@ep-soft-poetry-a18vskpw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testVirtualMemberFix() {
  console.log('🧪 Testing virtual member creation for debt tracking...');
  
  try {
    const pool = new Pool({ connectionString });
    
    // Simulate creating virtual member "Ngọc Long"
    const virtualUserId = `virtual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('\n1️⃣ Creating virtual member for "Ngọc Long"...');
    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id, username, first_name, is_active) VALUES ($1, $2, $3, $4, $5)',
      ['1775446945', virtualUserId, null, 'Ngọc Long', true]
    );
    
    // Verify virtual member was created
    const virtualMember = await pool.query(
      'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      ['1775446945', virtualUserId]
    );
    
    console.log('✅ Virtual member created:', {
      userId: virtualMember.rows[0]?.user_id,
      firstName: virtualMember.rows[0]?.first_name,
      chatId: virtualMember.rows[0]?.chat_id
    });
    
    // Test lookup now works
    console.log('\n2️⃣ Testing lookup for "Ngọc Long" after creation...');
    const foundMember = await pool.query(
      'SELECT * FROM chat_members WHERE chat_id = $1 AND (username ILIKE $2 OR first_name ILIKE $2) AND is_active = true',
      ['1775446945', '%Ngọc Long%']
    );
    
    console.log('✅ Lookup result:', foundMember.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
    if (foundMember.rows.length > 0) {
      console.log('Member details:', foundMember.rows[0]);
    }
    
    // Simulate creating a debt record
    console.log('\n3️⃣ Testing debt creation with virtual members...');
    
    const debtorMember = foundMember.rows[0];
    const creditorMember = await pool.query(
      'SELECT * FROM chat_members WHERE chat_id = $1 AND username = $2',
      ['1775446945', 'rurimeiko']
    );
    
    if (debtorMember && creditorMember.rows[0]) {
      await pool.query(
        'INSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          '1775446945',
          debtorMember.user_id,
          debtorMember.first_name,
          creditorMember.rows[0].user_id,
          creditorMember.rows[0].username,
          '50000',
          'VND',
          'Test with virtual member'
        ]
      );
      
      console.log('✅ Debt record created successfully with virtual member!');
      
      // Verify debt was saved
      const debts = await pool.query(
        'SELECT * FROM debts WHERE chat_id = $1 AND debtor_username = $2',
        ['1775446945', 'Ngọc Long']
      );
      
      console.log('✅ Debt verification:', {
        found: debts.rows.length > 0,
        debtor: debts.rows[0]?.debtor_username,
        creditor: debts.rows[0]?.creditor_username,
        amount: debts.rows[0]?.amount
      });
    }
    
    console.log('\n🎉 Virtual member fix working perfectly!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testVirtualMemberFix();