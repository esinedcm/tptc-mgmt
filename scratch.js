const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: new Date('2026-06-02T00:00:00Z'),
        lte: new Date('2026-06-04T23:59:59Z')
      }
    }
  });
  console.log('Bookings:', bookings);

  const events = await prisma.clubEvent.findMany({
    where: {
      startDate: {
        gte: new Date('2026-06-02T00:00:00Z'),
        lte: new Date('2026-06-04T23:59:59Z')
      }
    }
  });
  console.log('Events:', events);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
