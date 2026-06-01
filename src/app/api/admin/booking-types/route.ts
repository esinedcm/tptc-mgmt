import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const bookingTypes = await prisma.bookingType.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ bookingTypes }, { status: 200 });
  } catch (error) {
    console.error('Fetch booking types error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newBookingType = await prisma.bookingType.create({
      data: {
        name: name.toUpperCase().trim(),
        color: color || '#3b82f6',
        isBuiltIn: false
      }
    });

    return NextResponse.json({ bookingType: newBookingType }, { status: 201 });
  } catch (error: any) {
    console.error('Create booking type error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A booking type with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
