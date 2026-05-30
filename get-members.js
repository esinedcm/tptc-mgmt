const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { memberNumber: true } });
  console.log(users.map(u => u.memberNumber).sort());
}

main().finally(() => prisma.$disconnect());
