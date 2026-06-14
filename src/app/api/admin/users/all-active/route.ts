import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN' && payload.role !== 'PRO')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            status: 'Active'
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        memberNumber: true,
        managementRole: true,
      }
    });

    // Sort: SUPER_ADMIN > ADMIN > PRO > MEMBER, then alphabetically by firstName
    const roleRank = { 'SUPER_ADMIN': 1, 'ADMIN': 2, 'PRO': 3, 'MEMBER': 4 } as Record<string, number>;

    users.sort((a, b) => {
      const rankA = roleRank[a.role] || 4;
      const rankB = roleRank[b.role] || 4;
      if (rankA !== rankB) return rankA - rankB;
      const nameA = a.firstName.toLowerCase();
      const nameB = b.firstName.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Fetch all active users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
