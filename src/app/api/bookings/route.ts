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

    let whereClause: any = { status: 'ACTIVE' };
    if (startParam && endParam) {
      whereClause = {
        ...whereClause,
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

    const { courtId, startTime, endTime, type, title, description, participantIds, notes, bookAllCourts, recurrence } = await req.json();

    if ((!courtId && !bookAllCourts) || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
    let openHour = settings?.courtOpenTime ?? 6;
    let closeHour = settings?.courtCloseTime ?? 23;

    if (courtId) {
      const courtInfo = await prisma.court.findUnique({ where: { id: courtId } });
      if (courtInfo) {
        if (typeof courtInfo.openTime === 'number') openHour = courtInfo.openTime;
        if (typeof courtInfo.closeTime === 'number') closeHour = courtInfo.closeTime;
      }
    }

    if (start.getHours() < openHour || end.getHours() > closeHour || (end.getHours() === closeHour && end.getMinutes() > 0)) {
      return NextResponse.json({ error: `This court is only open from ${openHour}:00 to ${closeHour}:00.` }, { status: 400 });
    }

    // Role-based constraints
    const isAdmin = payload.role === 'ADMIN';
    const bookingType = isAdmin && type ? type : 'MEMBER';
    
    // Always include the organizer in the participants list
    const finalParticipantIds = Array.from(new Set([...(participantIds || []), payload.userId]));

    // Check if all participants (except maybe admin) have an active membership
    const activeMembers = await prisma.user.findMany({
      where: {
        id: { in: finalParticipantIds },
        memberships: {
          some: { status: 'Active' }
        }
      },
      select: { id: true }
    });

    const activeMemberIds = activeMembers.map(m => m.id);
    const nonActiveParticipants = finalParticipantIds.filter(id => !activeMemberIds.includes(id as string));

    if (nonActiveParticipants.length > 0) {
      // If it's just the admin who isn't active, that's fine.
      if (!(isAdmin && nonActiveParticipants.length === 1 && nonActiveParticipants[0] === payload.userId)) {
        return NextResponse.json({ error: 'Only Active members can book courts or be added as playing partners.' }, { status: 400 });
      }
    }

    if (!isAdmin) {
      const maxDays = settings?.maxDaysInAdvance ?? 3;
      const maxMinutes = (settings?.maxHoursPerDay ?? 2) * 60;

      // 1. Max X days in advance
      const advanceLimit = new Date();
      advanceLimit.setDate(advanceLimit.getDate() + maxDays);
      advanceLimit.setHours(23, 59, 59, 999);
      if (start > advanceLimit) {
        return NextResponse.json({ error: `Members can only book up to ${maxDays} days in advance.` }, { status: 400 });
      }

      // 2. Max X hours per day
      const startOfDay = new Date(start);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBookings = await prisma.booking.findMany({
        where: {
          participants: { some: { id: payload.userId as string } },
          status: 'ACTIVE',
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay }
        }
      });

      let totalMinutesBooked = 0;
      for (const b of existingBookings) {
        totalMinutesBooked += (b.endTime.getTime() - b.startTime.getTime()) / 60000;
      }

      const newBookingMinutes = (end.getTime() - start.getTime()) / 60000;
      if (totalMinutesBooked + newBookingMinutes > maxMinutes) {
        return NextResponse.json({ error: `Members can only book a maximum of ${maxMinutes / 60} hours per day.` }, { status: 400 });
      }
    }

    // Build the list of slots
    let courtsToBook = [courtId];
    if (isAdmin && bookAllCourts) {
      const allCourts = await prisma.court.findMany();
      courtsToBook = allCourts.map(c => c.id);
    }

    const slots: { courtId: string; start: Date; end: Date; recurringGroupId?: string }[] = [];
    
    if (isAdmin && recurrence && recurrence.weeks > 0 && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      const durationMs = end.getTime() - start.getTime();
      const startOfDay = new Date(start);
      startOfDay.setHours(0, 0, 0, 0);
      const recurringGroupId = crypto.randomUUID();

      for (let w = 0; w < recurrence.weeks; w++) {
        for (const dow of recurrence.daysOfWeek) {
          const currentDow = start.getDay();
          const diffDays = dow - currentDow;
          
          const slotStart = new Date(start);
          slotStart.setDate(slotStart.getDate() + (w * 7) + diffDays);
          
          // Only book if it's on or after the initial requested date
          if (slotStart.getTime() >= startOfDay.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + durationMs);
            for (const cid of courtsToBook) {
              slots.push({ courtId: cid, start: slotStart, end: slotEnd, recurringGroupId });
            }
          }
        }
      }
    } else {
      for (const cid of courtsToBook) {
        slots.push({ courtId: cid, start, end });
      }
    }

    const validSlots = [];
    const conflicts = [];

    for (const slot of slots) {
      const overlapping = await prisma.booking.findFirst({
        where: {
          courtId: slot.courtId,
          status: 'ACTIVE',
          startTime: { lt: slot.end },
          endTime: { gt: slot.start }
        },
        include: { court: true }
      });

      if (overlapping) {
        conflicts.push(`${overlapping.court.name} on ${slot.start.toLocaleDateString()} at ${slot.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
      } else {
        validSlots.push(slot);
      }
    }

    if (validSlots.length === 0) {
      return NextResponse.json({ error: 'All requested slots conflict with existing bookings.', conflicts }, { status: 400 });
    }

    const createdBookings = await prisma.$transaction(
      validSlots.map(slot => prisma.booking.create({
        data: {
          courtId: slot.courtId,
          startTime: slot.start,
          endTime: slot.end,
          type: bookingType,
          title: isAdmin ? title : null,
          description: isAdmin ? description : null,
          notes,
          recurringGroupId: slot.recurringGroupId,
          organizerId: payload.userId as string,
          participants: {
            connect: finalParticipantIds.map((id: string) => ({ id }))
          }
        },
        include: {
          court: true,
          participants: true,
          organizer: true
        }
      }))
    );

    // Send emails
    if (createdBookings.length > 0) {
      const firstBooking = createdBookings[0];
      const participantNames = firstBooking.participants.map(p => `${p.firstName} ${p.lastName}`);
      const isBatch = createdBookings.length > 1;

      for (const participant of firstBooking.participants) {
        if (participant.email) {
          await sendBookingEmail({
            to: participant.email,
            subject: isBatch ? 'Multiple Court Bookings Confirmed' : 'Court Booking Confirmed',
            bookingDetails: {
              action: 'created',
              courtName: isBatch ? 'Multiple Courts/Dates' : firstBooking.court.name,
              startTime: firstBooking.startTime,
              endTime: firstBooking.endTime,
              type: firstBooking.type,
              participantNames,
              bookedBy: firstBooking.organizer ? `${firstBooking.organizer.firstName} ${firstBooking.organizer.lastName}` : 'System',
              bookedAt: firstBooking.createdAt
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, count: createdBookings.length, conflicts }, { status: 201 });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
