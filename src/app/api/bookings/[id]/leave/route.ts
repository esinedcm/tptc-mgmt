import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendBookingEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });

    const body = await request.json();
    const { userIds, unregisterSeries } = body;
    const idsToUnregister: string[] = Array.isArray(userIds) ? userIds : [payload.userId as string];

    // Get the initial booking and its type
    const initialBooking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true }
    });

    if (!initialBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Identify which bookings to leave
    let targetBookings = [initialBooking];
    if (unregisterSeries && initialBooking.recurringGroupId) {
      const futureGroupBookings = await prisma.booking.findMany({
        where: {
          recurringGroupId: initialBooking.recurringGroupId,
          startTime: { gte: initialBooking.startTime },
          status: 'ACTIVE'
        },
        include: { court: true }
      });
      targetBookings = futureGroupBookings;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: payload.userId as string } });
    const householdId = currentUser?.householdId;

    const usersToProcess = await prisma.user.findMany({ where: { id: { in: idsToUnregister } } });
    for (const u of usersToProcess) {
      if (u.id !== currentUser?.id && u.householdId !== householdId) {
        return NextResponse.json({ error: 'You can only unregister yourself and your household members' }, { status: 403 });
      }
    }

    let unregisteredCount = 0;

    for (const b of targetBookings) {
      const currentBooking = await prisma.booking.findUnique({
        where: { id: b.id },
        include: { participants: { select: { id: true, firstName: true, lastName: true, email: true } }, waitlistedUsers: { select: { id: true } } }
      });

      if (!currentBooking) continue;

      const currentParticipantIds = currentBooking.participants.map(p => p.id);
      const currentWaitlistIds = currentBooking.waitlistedUsers.map(p => p.id);

      const activelyRegistered = idsToUnregister.filter(id => currentParticipantIds.includes(id));
      const waitlistRegistered = idsToUnregister.filter(id => currentWaitlistIds.includes(id));

      if (activelyRegistered.length === 0 && waitlistRegistered.length === 0) continue;

      // Disconnect from waitlist if they are there
      if (waitlistRegistered.length > 0) {
        await prisma.booking.update({
          where: { id: b.id },
          data: { waitlistedUsers: { disconnect: waitlistRegistered.map(uid => ({ id: uid })) } }
        });
      }

      // Disconnect from active participants if they are there
      if (activelyRegistered.length > 0) {
        await prisma.booking.update({
          where: { id: b.id },
          data: { participants: { disconnect: activelyRegistered.map(uid => ({ id: uid })) } }
        });
        unregisteredCount++;

        // If we freed up active spots, pull from waitlist
        const spotsFreed = activelyRegistered.length;
        if (spotsFreed > 0) {
          // Re-fetch waitlist as ordered by implicit join table or just pull the first N
          // Prisma doesn't guarantee order on many-to-many unless explicitly sorted, but we can just pick N
          // Actually, waitlistedUsers are returned in default order (usually ID/insertion order)
          const waitlisted = await prisma.booking.findUnique({
            where: { id: b.id },
            select: { waitlistedUsers: { select: { id: true, email: true, firstName: true } } }
          });
          
          if (waitlisted && waitlisted.waitlistedUsers.length > 0) {
            const usersToPromote = waitlisted.waitlistedUsers.slice(0, spotsFreed);
            
            await prisma.booking.update({
              where: { id: b.id },
              data: {
                participants: { connect: usersToPromote.map(u => ({ id: u.id })) },
                waitlistedUsers: { disconnect: usersToPromote.map(u => ({ id: u.id })) }
              }
            });

            // Notify promoted users
            for (const u of usersToPromote) {
              if (u.email) {
                await sendBookingEmail({
                  to: u.email,
                  subject: `Waitlist Update: Spot Opened for ${currentBooking.type}`,
                  bookingDetails: {
                    action: 'created',
                    courtName: '',
                    startTime: b.startTime,
                    endTime: b.endTime,
                    type: currentBooking.type,
                    participantNames: [],
                    bookedBy: 'System',
                    bookedAt: new Date()
                  },
                  customHtml: `<p>Hi ${u.firstName},</p><p>Good news! A spot opened up for <b>${currentBooking.type}</b> on ${new Date(b.startTime).toLocaleDateString()} at ${new Date(b.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} and you have been automatically moved from the waitlist to the active participant list.</p>`
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, count: unregisteredCount }, { status: 200 });
  } catch (error) {
    console.error('Leave booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
