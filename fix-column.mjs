// Quick script to check and add real_name column if it doesn't exist
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_Ur3GEKgwmD9O@ep-soft-poetry-a18vskpw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function checkAndAddColumn() {
  try {
    // Check if column exists
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tg_users' AND column_name = 'real_name'
    `;

    if (result.length === 0) {
      console.log('❌ Column real_name does not exist. Adding it...');
      await sql`ALTER TABLE tg_users ADD COLUMN real_name text`;
      console.log('✅ Column real_name added successfully!');
    } else {
      console.log('✅ Column real_name already exists.');
    }

    // Show current table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tg_users'
      ORDER BY ordinal_position
    `;
    console.log('\nCurrent tg_users table structure:');
    console.table(columns);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndAddColumn();
