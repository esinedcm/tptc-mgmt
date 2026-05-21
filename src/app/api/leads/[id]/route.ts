import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead }, { status: 200 });
  } catch (error) {
    console.error('Fetch lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
