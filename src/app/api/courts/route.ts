import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const courts = await prisma.court.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ courts }, { status: 200 });
  } catch (error) {
    console.error('Fetch courts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
