const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function seed() {
  const courts = ['Court 1', 'Court 2', 'Court 3'];
  for (const name of courts) {
    await prisma.court.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  console.log('Courts seeded.');
}
seed().catch(console.error).finally(() => prisma.$disconnect());
