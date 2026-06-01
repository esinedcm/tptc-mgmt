import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint to fetch booking types for the calendar UI
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
