import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.membership.updateMany({
    data: { season: '2026' }
  });
  console.log(`Updated ${result.count} memberships to season 2026`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
