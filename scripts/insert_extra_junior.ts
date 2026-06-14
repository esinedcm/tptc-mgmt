import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.membershipPlan.upsert({
    where: { name: 'Extra Junior' },
    update: { cost: 25 },
    create: { name: 'Extra Junior', cost: 25, description: 'Discounted rate for additional juniors in a family' }
  });
  console.log("Extra Junior plan inserted.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
