import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // Parse dates to cover the entire day
    const startDate = new Date(startDateParam);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        organizer: true,
        participants: true,
        court: true,
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch bookings report data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
