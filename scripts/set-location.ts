/**
 * Set User Location Script
 * Set location for testing Google Maps
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

function loadDatabaseUrl(): string {
  const devVarsPath = path.join(process.cwd(), '.env');
  let databaseUrl = process.env.NEON_DATABASE_URL || '';
  
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf-8');
    const match = content.match(/NEON_DATABASE_URL=(.+)/);
    if (match) {
      databaseUrl = match[1].trim();
    }
  }

  if (!databaseUrl) {
    console.error('❌ NEON_DATABASE_URL not found');
    process.exit(1);
  }

  return databaseUrl;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: npx tsx scripts/set-location.ts <tg_id> <latitude> <longitude> <location_name>');
    console.log('Example: npx tsx scripts/set-location.ts 1775446945 10.0452 105.7469 "Cần Thơ"');
    process.exit(1);
  }

  const [tgId, lat, lng, locationName] = args;
  
  const databaseUrl = loadDatabaseUrl();
  const sql = neon(databaseUrl);

  console.log(`\n📍 Setting location for user ${tgId}...`);
  console.log(`   Location: ${locationName}`);
  console.log(`   Coordinates: (${lat}, ${lng})\n`);

  // Update location
  await sql`
    UPDATE tg_users 
    SET 
      latitude = ${lat},
      longitude = ${lng},
      location_name = ${locationName},
      location_updated_at = NOW()
    WHERE tg_id = ${tgId}
  `;

  // Show result
  const result = await sql`
    SELECT id, tg_id, tg_username, display_name, latitude, longitude, location_name, location_updated_at 
    FROM tg_users 
    WHERE tg_id = ${tgId}
  `;

  if (result.length > 0) {
    console.log('✅ Location updated successfully!\n');
    console.log('User Info:');
    console.log(`  TG ID: ${result[0].tg_id}`);
    console.log(`  Username: ${result[0].tg_username || 'N/A'}`);
    console.log(`  Name: ${result[0].display_name || 'N/A'}`);
    console.log(`  Location: ${result[0].location_name}`);
    console.log(`  Coordinates: (${result[0].latitude}, ${result[0].longitude})`);
    console.log(`  Updated: ${result[0].location_updated_at}\n`);
  } else {
    console.log('⚠️ User not found. Make sure to chat with the bot first!\n');
  }
}

main().catch(console.error);
