import React from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function BookCourtPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyJwt(token);
  if (!payload || !payload.userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: { memberships: { orderBy: { createdAt: 'desc' }, take: 1 } }
  });

  const isActive = user?.memberships[0]?.status === 'Active';

  if (!isActive) {
    return (
      <div className="max-w-4xl mx-auto mt-12 p-8 text-center bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-2xl font-bold text-yellow-800 mb-2">Membership Pending</h2>
        <p className="text-yellow-700">You must have an Active membership to book a court. If you recently paid, please wait for an administrator to activate your account.</p>
      </div>
    );
  }

  const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
  const maxHours = settings?.maxHoursPerDay ?? 2;
  const maxDays = settings?.maxDaysInAdvance ?? 3;
  const openTime = settings?.courtOpenTime ?? 6;
  const closeTime = settings?.courtCloseTime ?? 23;
  const daysToShow = settings?.calendarDaysToShow ?? 3;
  const skipDays = settings?.calendarSkipDays ?? 1;

  const isAdminOrPro = payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN' || payload.role === 'PRO';

  if (!settings?.enableMemberCourtBooking && !isAdminOrPro) {
    return (
      <div className="max-w-4xl mx-auto mt-12 p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bookings Disabled</h2>
        <p className="text-gray-600">Court booking is currently disabled by administrators. Please check back later.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Book a Court</h1>
        <p className="mt-2 text-sm text-gray-600">
          Members can book up to {maxHours} hours per day, and up to {maxDays} days in advance.
        </p>
      </div>

      <BookingCalendar isAdmin={isAdminOrPro} currentUserId={payload.userId as string} openTime={openTime} closeTime={closeTime} daysToShow={daysToShow} skipDays={skipDays} />
    </div>
  );
}
