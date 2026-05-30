import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendRenewalLinkEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      // For security, don't reveal if email exists, just return success
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Generate a secure reset token valid for 24 hours
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry
      }
    });

    const previewUrl = await sendRenewalLinkEmail(user.email, token);

    return NextResponse.json({ success: true, emailPreviewUrl: previewUrl }, { status: 200 });
  } catch (error) {
    console.error('Send renewal link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
