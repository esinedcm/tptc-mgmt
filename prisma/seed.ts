import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('⚠️ Skipping admin seed: DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD environment variables not set.');
    return;
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingUser) {
    console.log(`✅ Admin user with email ${adminEmail} already exists. Skipping creation.`);
    return;
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      firstName: 'System',
      lastName: 'Admin',
      passwordHash: passwordHash,
      role: 'ADMIN',
      welcomeEmailSent: true
    }
  });

  console.log(`✅ Default admin account created successfully for: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
