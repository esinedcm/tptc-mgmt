import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminCheck = await checkAdmin('VIEW_MEMBERS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
      select: { activeSeason: true, enableCsvImport: true, enableWelcomeEmails: true }
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
            id: true,
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
            streetAddress: true,
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

    const activeCoupons = await prisma.couponCode.findMany({
      where: {
        validForMemberships: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountAmount: true,
        maxUses: true,
        currentUses: true
      }
    });

    return NextResponse.json({ 
      memberships,
      activeCoupons, 
      activeSeason,
      enableCsvImport: settings?.enableCsvImport ?? true,
      enableWelcomeEmails: settings?.enableWelcomeEmails ?? true,
      currentUserPermissions: adminCheck.user?.permissions || [],
      isSuperAdmin: adminCheck.user?.isSuperAdmin || false
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch memberships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
