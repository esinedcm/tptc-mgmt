import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const memberships = await prisma.membership.findMany({
      select: {
        id: true,
        status: true,
        membershipType: true,
        amountPaid: true,
        paymentNotes: true,
        paymentRecordedAt: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            memberNumber: true,
            tagNumber: true,
            email: true,
            phoneNumber: true,
            gender: true,
            streetNumber: true,
            streetName: true,
            city: true,
            postalCode: true,
            householdId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ memberships }, { status: 200 });
  } catch (error) {
    console.error('Fetch memberships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
