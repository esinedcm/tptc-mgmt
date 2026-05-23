const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
     const user = await prisma.user.findFirst();
     console.log(user);
     if (user) {
       await prisma.user.update({
         where: { id: user.id },
         data: { resetToken: 'test', resetTokenExpiry: new Date() }
       });
       console.log('Update success');
     }
  } catch (e) {
     console.error(e);
  }
}
test();
