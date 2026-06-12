import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminCheck = await checkAdmin('MANAGE_COUPONS');
    const eventAdminCheck = await checkAdmin('MANAGE_EVENTS');
    if (adminCheck.error && eventAdminCheck.error) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const coupons = await prisma.couponCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        validEvents: {
          select: { id: true, title: true }
        }
      }
    });

    return NextResponse.json({ coupons }, { status: 200 });
  } catch (error) {
    console.error('Fetch coupons error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin('MANAGE_COUPONS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const body = await request.json();
    const { id, code, discountType, discountAmount, description, maxUses, expiryDate, validForMemberships, validEventIds } = body;

    if (!code || !discountType || discountAmount === undefined) {
      return NextResponse.json({ error: 'Code, type, and amount are required' }, { status: 400 });
    }

    const eventConnections = Array.isArray(validEventIds) 
      ? validEventIds.map((eventId: string) => ({ id: eventId })) 
      : [];

    if (id) {
      // Update existing
      const updated = await prisma.couponCode.update({
        where: { id },
        data: {
          code: code,
          discountType,
          discountAmount: parseFloat(discountAmount),
          description,
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          validForMemberships: !!validForMemberships,
          validEvents: {
            set: eventConnections
          }
        },
        include: { validEvents: { select: { id: true, title: true } } }
      });
      return NextResponse.json({ coupon: updated }, { status: 200 });
    } else {
      // Create new
      const existing = await prisma.couponCode.findUnique({ where: { code: code } });
      if (existing) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });

      const created = await prisma.couponCode.create({
        data: {
          code: code,
          discountType,
          discountAmount: parseFloat(discountAmount),
          description,
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          validForMemberships: !!validForMemberships,
          validEvents: {
            connect: eventConnections
          }
        },
        include: { validEvents: { select: { id: true, title: true } } }
      });
      return NextResponse.json({ coupon: created }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Save coupon error:', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await checkAdmin('MANAGE_COUPONS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });

    await prisma.couponCode.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Delete coupon error:', error);
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete coupon because it has already been used by a member or event registration.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
