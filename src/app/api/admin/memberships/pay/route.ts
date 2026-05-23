import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { membershipId, amountPaid, paymentNotes } = body;

    if (!membershipId) {
      return NextResponse.json({ error: 'Missing membershipId' }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Wrap updates in a transaction to ensure atomic execution
    const updatedMemberships = await prisma.$transaction(async (tx) => {
      const now = new Date();
      
      // 1. Update the primary membership that was explicitly paid for
      const updatedPrimary = await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: 'Active',
          amountPaid: amountPaid ? parseFloat(amountPaid) : 0,
          paymentNotes: paymentNotes || null,
          paymentRecordedAt: now,
        },
      });

      // 2. If part of a household, sync payment status to the rest of the household 
      if (membership.user.householdId) {
        await tx.membership.updateMany({
          where: {
            user: { householdId: membership.user.householdId },
            id: { not: membershipId }, // Don't overwrite the primary we just updated
            status: { not: 'Active' }, // Only update pending ones
          },
          data: {
            status: 'Active',
            amountPaid: 0, // Attached to the primary member
            paymentNotes: paymentNotes || null,
            paymentRecordedAt: now,
          }
        });
      }

      return updatedPrimary;
    });

    // Send welcome email to the primary member
    if (membership.user && membership.user.email) {
      await sendWelcomeEmail({
        to: membership.user.email,
        firstName: membership.user.firstName,
        memberNumber: membership.user.memberNumber,
      });
    }

    return NextResponse.json({ success: true, membership: updatedMemberships }, { status: 200 });
  } catch (error) {
    console.error('Mark as paid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
