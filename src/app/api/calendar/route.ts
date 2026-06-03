import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end parameters are required' }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
      select: { activeSeason: true }
    });
    const activeSeason = settings?.activeSeason || '2026';

    // 1. Fetch Social Events (ClubEvents)
    const clubEvents = await prisma.clubEvent.findMany({
      where: {
        season: activeSeason,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });

    // 2. Fetch Admin Bookings (where type != 'MEMBER')
    const adminBookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        type: { not: 'MEMBER' },
        startTime: { lte: endDate },
        endTime: { gte: startDate }
      },
      include: {
        court: { select: { name: true } },
        organizer: { select: { firstName: true, lastName: true } }
      }
    });

    // 3. Fetch BookingTypes to get colors
    const bookingTypes = await prisma.bookingType.findMany();
    const typeColors = bookingTypes.reduce((acc, bt) => {
      acc[bt.name] = bt.color;
      return acc;
    }, {} as Record<string, string>);

    // Group admin bookings by time, type, and notes to avoid duplicates for multi-court events
    const groupedBookings: Record<string, typeof adminBookings[0] & { courtNames: string[] }> = {};
    for (const b of adminBookings) {
      const key = `${b.startTime.getTime()}-${b.endTime.getTime()}-${b.type}-${b.notes || ''}`;
      if (!groupedBookings[key]) {
        groupedBookings[key] = { ...b, courtNames: [b.court.name] };
      } else {
        groupedBookings[key].courtNames.push(b.court.name);
        groupedBookings[key].courtNames.sort();
      }
    }

    // Normalize events
    const unifiedEvents = [
      ...clubEvents.map(e => ({
        id: `event-${e.id}`,
        title: e.title,
        description: e.description,
        start: e.startDate,
        end: e.endDate,
        isAllDay: e.isAllDay,
        color: e.colorHex,
        type: 'SOCIAL'
      })),
      ...Object.values(groupedBookings).map(b => {
        const courtDisplay = b.courtNames.length > 2 ? 'All Courts' : b.courtNames.join(', ');
        const title = b.notes || `${b.type} (${courtDisplay})`;
        return {
          id: `booking-${b.id}`,
          title: title,
          description: b.organizer ? `Organizer: ${b.organizer.firstName} ${b.organizer.lastName}` : null,
          start: b.startTime,
          end: b.endTime,
          isAllDay: false, // Bookings are always time-bound
          color: typeColors[b.type] || '#3b82f6',
          type: b.type
        };
      })
    ];

    return NextResponse.json({ events: unifiedEvents }, { status: 200 });
  } catch (error) {
    console.error('Fetch calendar events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
