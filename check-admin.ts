import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'esinedc+admin@gmail.com' }
  });
  console.log(user);
}

main().finally(() => prisma.$disconnect());
