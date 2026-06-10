import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { sendEventRegistrationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userWithMemberships = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      include: { memberships: true }
    });

    const hasActiveMembership = userWithMemberships?.memberships?.some(m => m.status === 'Active');
    if (!hasActiveMembership) {
      return NextResponse.json({ error: 'You must have an active, paid membership to register for events.' }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, userIds } = body;

    if (!eventId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify event
    const event = await prisma.clubEvent.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const currentCount = event._count.registrations;
    const max = event.maxParticipants;
    
    // Create registrations
    const newRegistrations = [];
    let slotsTaken = 0;

    for (const uId of userIds) {
      // Check if already registered
      const existing = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: { eventId, userId: uId }
        }
      });

      if (existing) continue; // Skip existing

      // Determine status
      let status = 'REGISTERED';
      if (max !== null && (currentCount + slotsTaken) >= max) {
        status = 'WAITLISTED';
      }

      const reg = await prisma.eventRegistration.create({
        data: {
          eventId,
          userId: uId,
          status,
          hasPaid: false
        },
        include: {
          user: true
        }
      });

      newRegistrations.push(reg);
      slotsTaken++;
    }

    if (newRegistrations.length > 0) {
      // Fetch the primary user doing the registration
      const primaryUser = await prisma.user.findUnique({ where: { id: payload.userId as string }});
      
      if (primaryUser) {
        // We'll pass the list of newly registered users to the email function
        await sendEventRegistrationEmail(primaryUser, event, newRegistrations);
      }
    }

    return NextResponse.json({ success: true, registeredCount: newRegistrations.length }, { status: 200 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
