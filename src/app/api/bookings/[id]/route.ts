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
      include: { court: true, participants: true }
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Only Admin or Organizer can delete
    if (payload.role !== 'ADMIN' && booking.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.booking.delete({ where: { id } });

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
            participantNames
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
