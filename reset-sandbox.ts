import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file manually
const envPath = path.join(process.cwd(), '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const prisma = new PrismaClient();

async function main() {
  // Find active DATABASE_URL (uncommented)
  const dbUrlMatch = envContent.match(/^DATABASE_URL="(.*?)"/m);
  const dbUrl = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes('schema=onboarding')) {
    console.error('====================================================');
    console.error('ERROR: Your .env file is NOT pointing to the sandbox!');
    console.error('Please ensure DATABASE_URL contains "schema=onboarding"');
    console.error('before running this script to prevent data loss.');
    console.error('====================================================');
    process.exit(1);
  }

  console.log('Dropping the onboarding schema...');
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS onboarding CASCADE;`);
    console.log('Successfully dropped the onboarding schema.');
  } catch (error) {
    console.error('Error dropping schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\nRecreating tables in the onboarding schema...');
  try {
    // This will read the DATABASE_URL from .env and recreate all tables
    execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit' });
    console.log('\n✅ Successfully recreated the onboarding sandbox from scratch!');
    
    console.log('\nSeeding database with default admin user...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error recreating schema:', error);
  }
}

main();
