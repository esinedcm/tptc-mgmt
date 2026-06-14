import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export async function POST(req: Request) {
  try {
    const adminCheck = await checkAdmin('MANAGE_SETTINGS');
    if (adminCheck.error) return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    
    // Extra safety: only SUPER_ADMIN can wipe the database
    if (!adminCheck.user || !adminCheck.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Only SUPER_ADMIN can perform a system wipe' }, { status: 403 });
    }

    const superAdminId = adminCheck.user.id;

    // We must delete records in the correct order to respect foreign key constraints
    // 1. Delete all coupon usages
    await prisma.eventRegistration.updateMany({ data: { appliedCouponId: null } });
    await prisma.membership.updateMany({ data: { appliedCouponId: null } });
    
    // 2. Keep coupons, but reset their uses to 0 since we deleted all registrations
    await prisma.couponCode.updateMany({ data: { currentUses: 0 } });

    // 3. Delete all event registrations (but keep the ClubEvents)
    await prisma.eventRegistration.deleteMany();

    // 5. Unlink organizers from bookings so we can delete users
    await prisma.booking.updateMany({ data: { organizerId: null, coOrganizerId: null } });
    
    // 6. Disconnect participants and waitlisted users from bookings
    const bookings = await prisma.booking.findMany({ select: { id: true } });
    for (const b of bookings) {
      await prisma.booking.update({
        where: { id: b.id },
        data: {
          participants: { set: [] },
          waitlistedUsers: { set: [] }
        }
      });
    }

    // 7. Delete ONLY member bookings (keep lessons, leagues, maintenance, etc.)
    await prisma.booking.deleteMany({
      where: { type: 'MEMBER' }
    });

    // 8. Delete all archived memberships
    await prisma.archivedMembership.deleteMany();

    // 9. Delete all active/pending memberships
    await prisma.membership.deleteMany();

    // 10. Delete all leads
    await prisma.lead.deleteMany();

    // 11. Delete all users EXCEPT the super admin
    await prisma.user.deleteMany({
      where: {
        id: { not: superAdminId }
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('System wipe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
