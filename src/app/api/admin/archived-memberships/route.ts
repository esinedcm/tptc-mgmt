import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const archived = await prisma.archivedMembership.findMany({
      orderBy: {
        archivedAt: 'desc',
      },
    });

    return NextResponse.json({ archived }, { status: 200 });
  } catch (error) {
    console.error('Fetch archived memberships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
