import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courts = await prisma.court.findMany({
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ courts }, { status: 200 });
  } catch (error) {
    console.error('Fetch courts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, openTime, closeTime } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Court name is required' }, { status: 400 });
    }

    const court = await prisma.court.create({
      data: {
        name,
        openTime: typeof openTime === 'number' ? openTime : null,
        closeTime: typeof closeTime === 'number' ? closeTime : null,
      }
    });

    return NextResponse.json({ success: true, court }, { status: 201 });
  } catch (error) {
    console.error('Create court error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
