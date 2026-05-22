import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        status: 'Pending',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        gender: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ leads }, { status: 200 });
  } catch (error) {
    console.error('Fetch leads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
