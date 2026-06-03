import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
      select: { activeSeason: true }
    });
    const activeSeason = settings?.activeSeason || '2026';

    const events = await prisma.clubEvent.findMany({
      where: { season: activeSeason },
      orderBy: { startDate: 'asc' }
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Fetch events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, startDate, endDate, isAllDay, colorHex } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Title, start date, and end date are required' }, { status: 400 });
    }

    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
      select: { activeSeason: true }
    });
    const activeSeason = settings?.activeSeason || '2026';

    const newEvent = await prisma.clubEvent.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isAllDay: !!isAllDay,
        colorHex: colorHex || '#8b5cf6',
        season: activeSeason
      }
    });

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
