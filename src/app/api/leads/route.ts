import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInterestConfirmationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, gender } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // Optional: check if email is already in User or Lead
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered as a member' }, { status: 400 });
    }

    const existingLead = await prisma.lead.findUnique({ where: { email } });
    if (existingLead) {
      return NextResponse.json({ error: 'We already have your contact information on file!' }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || null,
        gender: gender || null,
        status: 'Pending',
      }
    });

    // Send confirmation email and await it so Vercel doesn't kill the function early
    try {
      await sendInterestConfirmationEmail({ to: email, firstName, leadId: lead.id });
    } catch (err) {
      console.error('Failed to send interest confirmation email:', err);
    }

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
