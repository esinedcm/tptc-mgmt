import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { sendBookingEmail } from '@/lib/email';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let whereClause = {};
    if (startParam && endParam) {
      whereClause = {
        startTime: { gte: new Date(startParam) },
        endTime: { lte: new Date(endParam) }
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        court: true,
        participants: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organizer: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courtId, startTime, endTime, type, participantIds, notes } = await req.json();

    if (!courtId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Role-based constraints
    const isAdmin = payload.role === 'ADMIN';
    const bookingType = isAdmin && type ? type : 'MEMBER';
    
    // Always include the organizer in the participants list
    const finalParticipantIds = Array.from(new Set([...(participantIds || []), payload.userId]));

    if (!isAdmin) {
      // 1. Max 3 days in advance
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);
      if (start > threeDaysFromNow) {
        return NextResponse.json({ error: 'Members can only book up to 3 days in advance.' }, { status: 400 });
      }

      // 2. Max 2 hours per day
      const startOfDay = new Date(start);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBookings = await prisma.booking.findMany({
        where: {
          participants: { some: { id: payload.userId as string } },
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay }
        }
      });

      let totalMinutesBooked = 0;
      for (const b of existingBookings) {
        totalMinutesBooked += (b.endTime.getTime() - b.startTime.getTime()) / 60000;
      }

      const newBookingMinutes = (end.getTime() - start.getTime()) / 60000;
      if (totalMinutesBooked + newBookingMinutes > 120) {
        return NextResponse.json({ error: 'Members can only book a maximum of 2 hours per day.' }, { status: 400 });
      }
    }

    // Overlapping booking check
    const overlapping = await prisma.booking.findFirst({
      where: {
        courtId,
        startTime: { lt: end },
        endTime: { gt: start }
      }
    });

    if (overlapping) {
      return NextResponse.json({ error: 'This court is already booked for the selected time.' }, { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        courtId,
        startTime: start,
        endTime: end,
        type: bookingType,
        notes,
        organizerId: payload.userId as string,
        participants: {
          connect: finalParticipantIds.map((id: string) => ({ id }))
        }
      },
      include: {
        court: true,
        participants: true
      }
    });

    // Send emails
    const participantNames = booking.participants.map(p => `${p.firstName} ${p.lastName}`);
    for (const participant of booking.participants) {
      if (participant.email) {
        await sendBookingEmail({
          to: participant.email,
          subject: 'Court Booking Confirmed',
          bookingDetails: {
            action: 'created',
            courtName: booking.court.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
            type: booking.type,
            participantNames
          }
        });
      }
    }

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
