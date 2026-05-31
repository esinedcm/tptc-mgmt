const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const t = await prisma.emailTemplate.findUnique({where: {id: 'REGISTRATION_PENDING'}});
  console.log(t);
  await prisma.$disconnect();
}
run();
