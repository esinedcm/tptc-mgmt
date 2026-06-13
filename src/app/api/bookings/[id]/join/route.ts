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
    const { userIds, registerSeries } = body;
    const idsToRegister: string[] = Array.isArray(userIds) ? userIds : [payload.userId as string];

    // Get the initial booking and its type
    const initialBooking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true }
    });

    if (!initialBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (initialBooking.status !== 'ACTIVE') return NextResponse.json({ error: 'Booking is no longer active' }, { status: 400 });

    const bookingType = await prisma.bookingType.findUnique({ where: { name: initialBooking.type } });
    if (!bookingType || !bookingType.allowMemberRegistration) {
      return NextResponse.json({ error: 'This booking type does not allow member registration' }, { status: 400 });
    }

    // Identify which bookings to register for
    let targetBookings = [initialBooking];
    if (registerSeries && initialBooking.recurringGroupId) {
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

    // Verify all registering users are active members and belong to current user's household
    const registeringUsers = await prisma.user.findMany({
      where: {
        id: { in: idsToRegister },
        memberships: { some: { status: 'Active' } }
      }
    });

    if (registeringUsers.length !== idsToRegister.length) {
      return NextResponse.json({ error: 'All registering users must have an Active membership' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: payload.userId as string } });
    const householdId = currentUser?.householdId;
    
    for (const u of registeringUsers) {
      if (u.id !== currentUser?.id && u.householdId !== householdId) {
        return NextResponse.json({ error: 'You can only register yourself and your household members' }, { status: 403 });
      }
    }

    let totalCost = 0;
    const registeredSlots = [];
    const waitlistedSlots = [];

    // Process registrations sequentially
    for (const b of targetBookings) {
      const currentBooking = await prisma.booking.findUnique({
        where: { id: b.id },
        include: { participants: { select: { id: true } }, waitlistedUsers: { select: { id: true } } }
      });

      if (!currentBooking) continue;

      const maxParticipants = currentBooking.maxParticipants ?? bookingType.maxParticipants;
      const currentParticipantIds = currentBooking.participants.map(p => p.id);
      const currentWaitlistIds = currentBooking.waitlistedUsers.map(p => p.id);

      const usersToJoin = idsToRegister.filter(id => !currentParticipantIds.includes(id) && !currentWaitlistIds.includes(id));
      if (usersToJoin.length === 0) continue;

      const costPerPerson = currentBooking.cost ?? bookingType.defaultCost ?? 0;
      totalCost += (costPerPerson * usersToJoin.length);

      const currentCount = currentParticipantIds.length;
      
      if (maxParticipants !== null) {
        const availableSpots = Math.max(0, maxParticipants - currentCount);
        
        if (availableSpots >= usersToJoin.length) {
          // Everyone fits
          await prisma.booking.update({
            where: { id: b.id },
            data: { participants: { connect: usersToJoin.map(uid => ({ id: uid })) } }
          });
          registeredSlots.push(b);
        } else if (availableSpots > 0) {
          // Some fit, some go to waitlist
          const fitUsers = usersToJoin.slice(0, availableSpots);
          const waitlistUsers = usersToJoin.slice(availableSpots);
          
          await prisma.booking.update({
            where: { id: b.id },
            data: { 
              participants: { connect: fitUsers.map(uid => ({ id: uid })) },
              waitlistedUsers: { connect: waitlistUsers.map(uid => ({ id: uid })) }
            }
          });
          registeredSlots.push(b);
          waitlistedSlots.push(b);
        } else {
          // All go to waitlist
          await prisma.booking.update({
            where: { id: b.id },
            data: { waitlistedUsers: { connect: usersToJoin.map(uid => ({ id: uid })) } }
          });
          waitlistedSlots.push(b);
        }
      } else {
        // No limit
        await prisma.booking.update({
          where: { id: b.id },
          data: { participants: { connect: usersToJoin.map(uid => ({ id: uid })) } }
        });
        registeredSlots.push(b);
      }
    }

    // Send confirmation email
    if (currentUser?.email && (registeredSlots.length > 0 || waitlistedSlots.length > 0)) {
      const participantNames = registeringUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ');
      
      let htmlBody = `<p>Hi ${currentUser.firstName},</p>`;
      htmlBody += `<p>You have successfully submitted registration for <b>${bookingType.name}</b> for the following members: ${participantNames}.</p>`;
      
      if (registeredSlots.length > 0) {
        htmlBody += `<p><b>Confirmed Dates:</b></p><ul>`;
        for (const slot of registeredSlots) {
          htmlBody += `<li>${new Date(slot.startTime).toLocaleDateString()} at ${new Date(slot.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} on ${slot.court.name}</li>`;
        }
        htmlBody += `</ul>`;
      }
      
      if (waitlistedSlots.length > 0) {
        htmlBody += `<p><b>Waitlisted Dates (Full):</b></p><ul>`;
        for (const slot of waitlistedSlots) {
          htmlBody += `<li>${new Date(slot.startTime).toLocaleDateString()} at ${new Date(slot.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} on ${slot.court.name}</li>`;
        }
        htmlBody += `</ul>`;
        htmlBody += `<p>You will be notified automatically if a spot opens up.</p>`;
      }

      if (totalCost > 0) {
        htmlBody += `<p><b>Total Offline Fee: $${totalCost.toFixed(2)}</b></p>`;
        htmlBody += `<p>Please note that this fee is collected offline (not through the app). Please arrange payment with the club or instructor.</p>`;
      }

      htmlBody += `<p>Thank you,<br/>Tennis Club Management System</p>`;

      await sendBookingEmail({
        to: currentUser.email,
        subject: `Registration Confirmation: ${bookingType.name}`,
        bookingDetails: {
          action: 'created',
          courtName: '', // Custom email body overrides this
          startTime: initialBooking.startTime,
          endTime: initialBooking.endTime,
          type: bookingType.name,
          participantNames: [participantNames],
          bookedBy: 'You',
          bookedAt: new Date()
        },
        customHtml: htmlBody
      });
    }

    return NextResponse.json({ success: true, registeredSlots: registeredSlots.length, waitlistedSlots: waitlistedSlots.length, totalCost }, { status: 200 });
  } catch (error) {
    console.error('Join booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
