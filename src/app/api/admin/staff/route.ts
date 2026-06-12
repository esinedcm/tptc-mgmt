import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminCheck = await checkAdmin('SUPER_ADMIN');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const staff = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        adminPermissions: true
      },
      orderBy: { firstName: 'asc' }
    });

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    console.error('Fetch staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin('SUPER_ADMIN');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isCurrentlySuperAdmin = targetUser.role === 'ADMIN' && 
      (targetUser.adminPermissions.includes('SUPER_ADMIN') || targetUser.adminPermissions.length === 0);

    const newPermissions = Array.isArray(permissions) ? permissions : [];
    if (!newPermissions.includes('VIEW_MEMBERS')) {
      newPermissions.push('VIEW_MEMBERS');
    }

    if (isCurrentlySuperAdmin && !newPermissions.includes('SUPER_ADMIN')) {
      const allAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      const superAdmins = allAdmins.filter(u => u.adminPermissions.includes('SUPER_ADMIN') || u.adminPermissions.length === 0);
      if (superAdmins.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove Super Admin privileges from the only Super Admin.' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'ADMIN',
        adminPermissions: Array.isArray(permissions) ? permissions : []
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        adminPermissions: true
      }
    });

    return NextResponse.json({ staff: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('Promote staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await checkAdmin('SUPER_ADMIN');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });

    const body = await request.json();
    const { userId } = body;

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    
    // Prevent self-demotion
    if (userId === adminCheck.user?.id) {
      return NextResponse.json({ error: 'You cannot demote yourself.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isCurrentlySuperAdmin = targetUser.role === 'ADMIN' && 
      (targetUser.adminPermissions.includes('SUPER_ADMIN') || targetUser.adminPermissions.length === 0);

    if (isCurrentlySuperAdmin) {
      const allAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      const superAdmins = allAdmins.filter(u => u.adminPermissions.includes('SUPER_ADMIN') || u.adminPermissions.length === 0);
      if (superAdmins.length <= 1) {
        return NextResponse.json({ error: 'Cannot demote the only Super Admin.' }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'MEMBER',
        adminPermissions: []
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Demote staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
