import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' }
    });
    const activeSeason = settings?.activeSeason || '2026';

    // Fetch all users who do NOT have a membership in the activeSeason
    const pastUsers = await prisma.user.findMany({
      where: {
        NOT: {
          memberships: {
            some: {
              season: activeSeason
            }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        memberNumber: true,
        tagNumber: true,
        role: true,
        createdAt: true,
        memberships: {
          select: {
            season: true,
            membershipType: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    return NextResponse.json({ pastMembers: pastUsers, activeSeason }, { status: 200 });
  } catch (error) {
    console.error('Fetch past members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
