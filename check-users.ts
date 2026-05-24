import { prisma } from './src/lib/prisma';

async function run() {
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, role: true, email: true }
  });
  console.table(users);
}
run();
