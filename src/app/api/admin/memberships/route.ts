import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' }
    });
    const activeSeason = settings?.activeSeason || '2026';

    const memberships = await prisma.membership.findMany({
      where: {
        season: activeSeason
      },
      select: {
        id: true,
        status: true,
        membershipType: true,
        amountPaid: true,
        paymentNotes: true,
        paymentRecordedAt: true,
        createdAt: true,
        season: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            memberNumber: true,
            tagNumber: true,
            email: true,
            phoneNumber: true,
            role: true,
            gender: true,
            dateOfBirth: true,
            wantsFreeLessons: true,
            streetNumber: true,
            streetName: true,
            city: true,
            postalCode: true,
            householdId: true,
            memberships: {
              select: {
                season: true
              }
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ memberships, activeSeason }, { status: 200 });
  } catch (error) {
    console.error('Fetch memberships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
