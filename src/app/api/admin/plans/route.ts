import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ plans }, { status: 200 });
  } catch (error) {
    console.error('Fetch plans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, cost } = body;

    if (!name || cost === undefined || cost < 0) {
      return NextResponse.json({ error: 'Name and valid cost are required' }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name,
        description,
        cost
      }
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: any) {
    console.error('Create plan error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A plan with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
