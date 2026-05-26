import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Court ID is required' }, { status: 400 });

    const { name, openTime, closeTime } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Court name is required' }, { status: 400 });
    }

    const updatedCourt = await prisma.court.update({
      where: { id },
      data: {
        name,
        openTime: typeof openTime === 'number' ? openTime : null,
        closeTime: typeof closeTime === 'number' ? closeTime : null,
      }
    });

    return NextResponse.json({ success: true, court: updatedCourt }, { status: 200 });
  } catch (error) {
    console.error('Update court error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Court ID is required' }, { status: 400 });

    // Check if court has any active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        courtId: id,
        status: 'ACTIVE',
        endTime: { gt: new Date() } // only future/current active bookings matter
      }
    });

    if (activeBookings > 0) {
      return NextResponse.json({ error: `Cannot delete court. There are ${activeBookings} active future bookings on it.` }, { status: 400 });
    }

    await prisma.court.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete court error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
