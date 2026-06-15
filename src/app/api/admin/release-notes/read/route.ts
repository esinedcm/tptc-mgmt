import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { lastReadReleaseHash: true }
    });

    return NextResponse.json({ lastReadReleaseHash: user?.lastReadReleaseHash || null }, { status: 200 });
  } catch (error) {
    console.error('GET release notes read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = payload.userId as string;

    const { hash } = await req.json();

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { lastReadReleaseHash: hash }
    });

    return NextResponse.json({ success: true, lastReadReleaseHash: user.lastReadReleaseHash }, { status: 200 });
  } catch (error) {
    console.error('Mark release notes read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
