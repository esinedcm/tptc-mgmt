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
  } else {
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

  // Seed default booking types
  const defaultBookingTypes = [
    { name: 'MEMBER', color: '#3b82f6', isBuiltIn: true },
    { name: 'LESSON', color: '#a855f7', isBuiltIn: false },
    { name: 'LEAGUE', color: '#f97316', isBuiltIn: false },
    { name: 'MAINTENANCE', color: '#6b7280', isBuiltIn: false }
  ];

  for (const bt of defaultBookingTypes) {
    await prisma.bookingType.upsert({
      where: { name: bt.name },
      update: { isBuiltIn: bt.isBuiltIn }, // Only ensure isBuiltIn is correct, don't overwrite user's color
      create: bt
    });
  }
  console.log(`✅ Default booking types seeded successfully.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
