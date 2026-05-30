import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendImportWelcomeEmail } from '@/lib/email';

export async function GET() {
  try {
    const count = await prisma.user.count({
      where: {
        welcomeEmailSent: false,
        resetToken: { not: null },
      }
    });
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Find users who have a reset token and haven't been sent a welcome email yet
    const usersToEmail = await prisma.user.findMany({
      where: {
        welcomeEmailSent: false,
        resetToken: { not: null },
      }
    });

    if (usersToEmail.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending welcome emails to send.', sentCount: 0 });
    }

    let sentCount = 0;
    const errors = [];

    for (const user of usersToEmail) {
      if (!user.resetToken) continue; // Type check

      try {
        await sendImportWelcomeEmail({
          to: user.email,
          firstName: user.firstName,
          resetToken: user.resetToken,
        });

        // Mark as sent
        await prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSent: true }
        });

        sentCount++;
      } catch (err: any) {
        console.error(`Failed to send welcome email to ${user.email}:`, err);
        errors.push({ email: user.email, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      sentCount, 
      errors: errors.length > 0 ? errors : undefined 
    });

  } catch (error: any) {
    console.error('Send welcome email error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
