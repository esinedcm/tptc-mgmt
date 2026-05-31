import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendImportWelcomeEmail, sendRenewalLinkEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type } = body;

    if (!userId || !type) {
      return NextResponse.json({ error: 'Missing userId or type' }, { status: 400 });
    }

    if (type !== 'welcome' && type !== 'renewal') {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure they have a resetToken for the magic link
    let resetToken = user.resetToken;
    let resetTokenExpiry = user.resetTokenExpiry;

    if (!resetToken || !resetTokenExpiry || resetTokenExpiry < new Date()) {
      resetToken = crypto.randomUUID();
      resetTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days valid for these links
      
      await prisma.user.update({
        where: { id: userId },
        data: { resetToken, resetTokenExpiry }
      });
    }

    // Send the specific email
    if (type === 'welcome') {
      const emailResult = await sendImportWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        resetToken: resetToken,
      });

      if (!emailResult.success) {
        throw new Error('Email sending failed');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { welcomeEmailSent: true }
      });

    } else if (type === 'renewal') {
      const emailResult = await sendRenewalLinkEmail(user.email, resetToken);

      if (!emailResult.success) {
        throw new Error('Email sending failed');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resending email:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
