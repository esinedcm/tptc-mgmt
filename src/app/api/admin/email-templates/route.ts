import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany();
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching email templates:', error);
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
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, subject, htmlBody } = await req.json();

    if (!id || !subject || !htmlBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const template = await prisma.emailTemplate.upsert({
      where: { id },
      update: { subject, htmlBody },
      create: { id, subject, htmlBody },
    });

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
