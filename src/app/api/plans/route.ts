import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let plans = await prisma.membershipPlan.findMany();

    if (plans.length === 0) {
      // Seed default plans
      await prisma.membershipPlan.createMany({
        data: [
          { name: 'Adult', description: '18 years and over', cost: 85 },
          { name: 'Senior', description: '65 years and over', cost: 70 },
          { name: 'Junior', description: 'under 18 years', cost: 50 },
          { name: 'Family', description: '2 Adults and 1 or 2 Juniors', cost: 200 },
        ],
      });
      plans = await prisma.membershipPlan.findMany();
    }

    return NextResponse.json({ plans }, { status: 200 });
  } catch (error) {
    console.error('Fetch plans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
