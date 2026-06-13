import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { sendBookingEmail } from '@/lib/email';
import { cookies } from 'next/headers';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const applyToFuture = searchParams.get('applyToFuture') === 'true';

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true, participants: true, organizer: true }
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Only Admin or Organizer can delete
    if (payload.role !== 'ADMIN' && booking.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payload.role !== 'ADMIN') {
      const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
      const cutoffMinutes = settings?.cancellationCutoffMinutes ?? 90;
      
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() + cutoffMinutes);
      
      if (new Date(booking.startTime) < cutoffTime) {
        return NextResponse.json({ error: `Bookings cannot be cancelled less than ${cutoffMinutes} minutes before start time.` }, { status: 400 });
      }
    }

    let bookingsToCancel = [booking];
    if (applyToFuture && booking.recurringGroupId && payload.role === 'ADMIN') {
      const futureGroupBookings = await prisma.booking.findMany({
        where: {
          recurringGroupId: booking.recurringGroupId,
          startTime: { gte: booking.startTime },
          status: 'ACTIVE'
        },
        include: { court: true, participants: true, organizer: true }
      });
      bookingsToCancel = futureGroupBookings;
    }

    await prisma.booking.updateMany({
      where: { id: { in: bookingsToCancel.map(b => b.id) } },
      data: { status: 'CANCELLED' }
    });

    // Send emails
    const emailedAddresses = new Set<string>();
    
    for (const b of bookingsToCancel) {
      const participantNames = b.participants.map(p => `${p.firstName} ${p.lastName}`);
      for (const participant of b.participants) {
        if (participant.email) {
          if (emailedAddresses.has(participant.email)) continue;
          emailedAddresses.add(participant.email);
          
          await sendBookingEmail({
            to: participant.email,
            subject: 'Court Booking Cancelled',
            bookingDetails: {
              action: 'cancelled',
              courtName: b.court.name,
              startTime: b.startTime,
              endTime: b.endTime,
              type: b.type,
              participantNames,
              bookedBy: b.organizer ? `${b.organizer.firstName} ${b.organizer.lastName}` : 'System',
              bookedAt: b.createdAt
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, count: bookingsToCancel.length }, { status: 200 });
  } catch (error) {
    console.error('Delete booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = payload.role === 'ADMIN';

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });

    const { courtId, startTime, endTime, type, title, description, participantIds, notes, applyToFuture, minParticipants, maxParticipants, cost, organizerId, coOrganizerId, internalNotes } = await request.json();

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

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true, participants: true, organizer: true }
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    if (!isAdmin && booking.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAdmin) {
      const maxDays = settings?.maxDaysInAdvance ?? 3;
      const maxMinutes = (settings?.maxHoursPerDay ?? 2) * 60;

      const daysAhead = (start.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      if (daysAhead > maxDays) {
        return NextResponse.json({ error: `Members can only book up to ${maxDays} days in advance.` }, { status: 400 });
      }

      const startOfDay = new Date(start);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23,59,59,999);

      const existingBookings = await prisma.booking.findMany({
        where: {
          organizerId: payload.userId as string,
          status: 'ACTIVE',
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay },
          id: { not: id }
        }
      });

      let totalMinutes = (end.getTime() - start.getTime()) / 60000;
      for (const b of existingBookings) {
        totalMinutes += (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
      }

      if (totalMinutes > maxMinutes) {
        return NextResponse.json({ error: `You cannot book more than ${maxMinutes / 60} hours per day.` }, { status: 400 });
      }
    }

    let bookingsToUpdate = [booking];
    const startDelta = start.getTime() - new Date(booking.startTime).getTime();
    const endDelta = end.getTime() - new Date(booking.endTime).getTime();

    if (applyToFuture && booking.recurringGroupId && isAdmin) {
      const futureGroupBookings = await prisma.booking.findMany({
        where: {
          recurringGroupId: booking.recurringGroupId,
          startTime: { gte: booking.startTime },
          status: 'ACTIVE'
        },
        include: { court: true, participants: true, organizer: true }
      });
      bookingsToUpdate = futureGroupBookings;
    }

    // Always include organizer
    const finalParticipantIds = Array.from(new Set([...(participantIds || []), booking.organizerId]));

    const activeMembers = await prisma.user.findMany({
      where: {
        id: { in: finalParticipantIds },
        memberships: { some: { status: 'Active' } }
      },
      select: { id: true }
    });

    const activeMemberIds = activeMembers.map(m => m.id);
    const nonActiveParticipants = finalParticipantIds.filter(id => !activeMemberIds.includes(id as string));

    if (nonActiveParticipants.length > 0) {
      if (!(isAdmin && nonActiveParticipants.length === 1 && nonActiveParticipants[0] === payload.userId)) {
        return NextResponse.json({ error: 'Only Active members can book courts or be added as playing partners.' }, { status: 400 });
      }
    }

    // Prepare updates and check for overlapping
    const transactionOperations = [];
    
    const uniqueCourtsInSeries = new Set(bookingsToUpdate.map(b => b.courtId));
    const isMultiCourtSeries = uniqueCourtsInSeries.size > 1;

    for (const b of bookingsToUpdate) {
      const newStart = new Date(new Date(b.startTime).getTime() + startDelta);
      const newEnd = new Date(new Date(b.endTime).getTime() + endDelta);
      const targetCourtId = isMultiCourtSeries ? b.courtId : courtId;

      // Check overlaps excluding all bookings in this update batch
      const overlapping = await prisma.booking.findFirst({
        where: {
          courtId: targetCourtId,
          id: { notIn: bookingsToUpdate.map(updateB => updateB.id) },
          status: 'ACTIVE',
          startTime: { lt: newEnd },
          endTime: { gt: newStart }
        }
      });

      if (overlapping) {
        return NextResponse.json({ error: `The court is already booked for a conflicting time on ${newStart.toLocaleDateString()}.` }, { status: 400 });
      }

      transactionOperations.push(
        prisma.booking.update({
          where: { id: b.id },
          data: {
            courtId: targetCourtId,
            startTime: newStart,
            endTime: newEnd,
            type,
            title: isAdmin ? (title || null) : undefined,
            description: isAdmin ? (description || null) : undefined,
            notes,
            minParticipants: isAdmin && minParticipants !== undefined ? minParticipants : undefined,
            maxParticipants: isAdmin && maxParticipants !== undefined ? maxParticipants : undefined,
            cost: isAdmin && cost !== undefined ? cost : undefined,
            organizerId: isAdmin && organizerId !== undefined ? organizerId : undefined,
            coOrganizerId: isAdmin && coOrganizerId !== undefined ? coOrganizerId : undefined,
            internalNotes: isAdmin && internalNotes !== undefined ? internalNotes : undefined,
            participants: {
              set: finalParticipantIds.map((pid: string) => ({ id: pid }))
            }
          },
          include: { court: true, participants: true, organizer: true }
        })
      );
    }

    const results = await prisma.$transaction(transactionOperations);

    // Send emails
    for (const updatedBooking of results) {
      const participantNames = updatedBooking.participants.map(p => `${p.firstName} ${p.lastName}`);
      for (const participant of updatedBooking.participants) {
        if (participant.email) {
          await sendBookingEmail({
            to: participant.email,
            subject: 'Court Booking Updated',
            bookingDetails: {
              action: 'updated',
              courtName: updatedBooking.court.name,
              startTime: updatedBooking.startTime,
              endTime: updatedBooking.endTime,
              type: updatedBooking.type,
              participantNames,
              bookedBy: updatedBooking.organizer ? `${updatedBooking.organizer.firstName} ${updatedBooking.organizer.lastName}` : 'System',
              bookedAt: updatedBooking.createdAt
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, booking: results[0] }, { status: 200 });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

