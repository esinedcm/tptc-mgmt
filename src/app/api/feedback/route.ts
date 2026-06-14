import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { subject, message, name, email, appVersion, userAgent } = await request.json();
    const headersList = request.headers;
    const fallbackUserAgent = headersList.get('user-agent') || null;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        name: name || null,
        email: email || null,
        subject,
        message,
        appVersion: appVersion || process.env.NEXT_PUBLIC_BUILD_VERSION || null,
        userAgent: userAgent || fallbackUserAgent,
      }
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
