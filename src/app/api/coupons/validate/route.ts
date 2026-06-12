import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const eventId = searchParams.get('eventId'); // Optional: pass eventId if validating for an event
    const type = searchParams.get('type'); // "MEMBERSHIP" or "EVENT"

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const coupon = await prisma.couponCode.findUnique({
      where: { code: code },
      include: {
        validEvents: { select: { id: true } }
      }
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    // Check expiry
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return NextResponse.json({ error: 'This coupon code has expired' }, { status: 400 });
    }

    // Check usage limits
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({ error: 'This coupon code has reached its usage limit' }, { status: 400 });
    }

    // Check context (membership vs event)
    if (type === 'MEMBERSHIP' && !coupon.validForMemberships) {
      return NextResponse.json({ error: 'This coupon code is not valid for memberships' }, { status: 400 });
    }

    if (type === 'EVENT') {
      if (eventId) {
        // If the coupon has validEvents linked, it must match.
        // If validEvents is empty, it means valid for all events? Or we only check if validEvents includes it.
        // Actually the spec: "allow an admin to identify when creating an event if coupon codes are to be used and what coupon codes are valid for that event".
        // The many-to-many relation exists. We check if `eventId` is in `validEvents`.
        const isValidForThisEvent = coupon.validEvents.some(e => e.id === eventId);
        if (!isValidForThisEvent) {
          return NextResponse.json({ error: 'This coupon code is not valid for this event' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Event ID is required to validate event coupons' }, { status: 400 });
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount: coupon.discountAmount,
        description: coupon.description
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
