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

    await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // Send emails
    const participantNames = booking.participants.map(p => `${p.firstName} ${p.lastName}`);
    for (const participant of booking.participants) {
      if (participant.email) {
        await sendBookingEmail({
          to: participant.email,
          subject: 'Court Booking Cancelled',
          bookingDetails: {
            action: 'cancelled',
            courtName: booking.court.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
            type: booking.type,
            participantNames,
            bookedBy: booking.organizer ? `${booking.organizer.firstName} ${booking.organizer.lastName}` : 'System',
            bookedAt: booking.createdAt
          }
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
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
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });

    const { courtId, startTime, endTime, type, participantIds, notes } = await request.json();

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
    const openHour = settings?.courtOpenTime ?? 6;
    const closeHour = settings?.courtCloseTime ?? 23;

    if (start.getHours() < openHour || end.getHours() > closeHour || (end.getHours() === closeHour && end.getMinutes() > 0)) {
      return NextResponse.json({ error: `Courts are only open from ${openHour}:00 to ${closeHour}:00.` }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true, participants: true, organizer: true }
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Check overlaps excluding current booking
    const overlapping = await prisma.booking.findFirst({
      where: {
        courtId,
        id: { not: id },
        status: 'ACTIVE',
        startTime: { lt: end },
        endTime: { gt: start }
      }
    });

    if (overlapping) {
      return NextResponse.json({ error: 'This court is already booked for the selected time.' }, { status: 400 });
    }

    // Always include organizer
    const finalParticipantIds = Array.from(new Set([...(participantIds || []), booking.organizerId]));

    const isAdmin = payload.role === 'ADMIN';

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

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        courtId,
        startTime: start,
        endTime: end,
        type,
        notes,
        participants: {
          set: finalParticipantIds.map((pid: string) => ({ id: pid }))
        }
      },
      include: {
        court: true,
        participants: true,
        organizer: true
      }
    });

    // Send emails
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

    return NextResponse.json({ success: true, booking: updatedBooking }, { status: 200 });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

