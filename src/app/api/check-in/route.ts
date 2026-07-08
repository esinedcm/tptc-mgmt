import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import * as jose from 'jose';

export const dynamic = 'force-dynamic';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', status: 'unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev');
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.userId as string;

    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
    });

    if (!settings?.enableQrCheckIn) {
      return NextResponse.json({ error: 'Check-in feature is disabled by the club.' }, { status: 400 });
    }

    // Find a booking that is starting within the next 45 minutes, or currently ongoing, where the user is an organizer or participant
    const now = new Date();
    const windowStart = new Date(now.getTime() + 45 * 60000); // 45 mins from now
    const windowEnd = now; // It must not have ended yet

    const activeBooking = await prisma.booking.findFirst({
      where: {
        AND: [
          { startTime: { lte: windowStart } },
          { endTime: { gt: windowEnd } },
          { status: 'ACTIVE' },
          {
            OR: [
              { organizerId: userId },
              { participants: { some: { id: userId } } },
              { coOrganizerId: userId },
            ]
          }
        ]
      },
      include: {
        court: true,
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    if (!activeBooking) {
      return NextResponse.json({ booking: null, message: 'No upcoming or active bookings found.' }, { status: 200 });
    }

    return NextResponse.json({ booking: activeBooking, settings: { requireGpsCheckIn: settings.requireGpsCheckIn } }, { status: 200 });
  } catch (error) {
    console.error('Check-in GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev');
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.userId as string;

    const { bookingId, lat, lng } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
    });

    if (!settings?.enableQrCheckIn) {
      return NextResponse.json({ error: 'Check-in feature is disabled by the club.' }, { status: 400 });
    }

    if (settings.requireGpsCheckIn) {
      if (!lat || !lng) {
        return NextResponse.json({ error: 'Location permissions are required to check in.' }, { status: 400 });
      }
      
      if (!settings.clubLatitude || !settings.clubLongitude) {
        // Club hasn't set their coords yet, can't enforce GPS
      } else {
        const distanceMeters = getDistance(
          lat, 
          lng, 
          settings.clubLatitude, 
          settings.clubLongitude
        );
        
        // 250 meters is a reasonable geofence radius for a tennis club (includes parking lot)
        if (distanceMeters > 250) {
          return NextResponse.json({ error: `You are too far from the club to check in. Please check in when you arrive on the premises.` }, { status: 400 });
        }
      }
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { participants: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const isMemberOfBooking = booking.organizerId === userId || 
                              booking.coOrganizerId === userId ||
                              booking.participants.some(p => p.id === userId);

    if (!isMemberOfBooking) {
      return NextResponse.json({ error: 'You are not part of this booking.' }, { status: 403 });
    }
    
    if (booking.checkedInAt) {
      return NextResponse.json({ error: 'Booking is already checked in.' }, { status: 400 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { checkedInAt: new Date() }
    });

    return NextResponse.json({ success: true, booking: updatedBooking }, { status: 200 });

  } catch (error) {
    console.error('Check-in POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
