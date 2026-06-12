import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/email';
import { checkAdmin } from '@/lib/check-admin';

export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin('EDIT_MEMBERS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const body = await request.json();
    const { membershipId, amountPaid, paymentNotes, coveredMembershipIds, couponCodeId, discountAmount, totalMembershipCost } = body;

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
          appliedCouponId: couponCodeId || null,
          discountAmount: discountAmount ? parseFloat(discountAmount) : null
        },
      });

      if (couponCodeId) {
        await tx.couponCode.update({
          where: { id: couponCodeId },
          data: { currentUses: { increment: 1 } }
        });
      }

      // 2. Process other explicitly covered household members
      if (Array.isArray(coveredMembershipIds) && coveredMembershipIds.length > 0) {
        // Filter out the primary membershipId from the covered array just to be safe
        const otherIds = coveredMembershipIds.filter((id: string) => id !== membershipId);
        
        if (otherIds.length > 0) {
          await tx.membership.updateMany({
            where: {
              id: { in: otherIds },
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
      }

      return updatedPrimary;
    });

    // Send welcome emails to all members included in this payment
    const allIdsToWelcome = [membershipId, ...(Array.isArray(coveredMembershipIds) ? coveredMembershipIds : [])];
    
    const membershipsToWelcome = await prisma.membership.findMany({
      where: { id: { in: allIdsToWelcome } },
      include: { user: true }
    });

    for (const m of membershipsToWelcome) {
      if (m.user && m.user.email) {
        try {
          const isPrimary = m.id === membershipId;
          let paymentSummary;
          
          if (isPrimary && discountAmount > 0) {
            paymentSummary = {
              totalMembershipCost: totalMembershipCost ? parseFloat(totalMembershipCost) : 0,
              discountAmount: parseFloat(discountAmount),
              amountPaid: amountPaid ? parseFloat(amountPaid) : 0
            };
          }

          await sendWelcomeEmail({
            to: m.user.email,
            firstName: m.user.firstName,
            memberNumber: m.user.memberNumber,
            paymentSummary
          });
        } catch (e) {
          console.error(`Failed to send welcome email to ${m.user.email}:`, e);
        }
      }
    }

    return NextResponse.json({ success: true, membership: updatedMemberships }, { status: 200 });
  } catch (error) {
    console.error('Mark as paid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
