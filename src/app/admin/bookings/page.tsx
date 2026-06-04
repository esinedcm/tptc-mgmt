import React from 'react';
import AdminBookingsTabs from './AdminBookingsTabs';
import AdminBookingsActions from './AdminBookingsActions';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function AdminBookingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyJwt(token);
  if (!payload || payload.role !== 'ADMIN') redirect('/login');

  const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
  const openTime = settings?.courtOpenTime ?? 6;
  const closeTime = settings?.courtCloseTime ?? 23;
  const daysToShow = settings?.calendarDaysToShow ?? 3;
  const skipDays = settings?.calendarSkipDays ?? 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          </div>
          <AdminBookingsActions />
        </div>

        <AdminBookingsTabs 
          currentUserId={payload.userId as string} 
          openTime={openTime} 
          closeTime={closeTime} 
          daysToShow={daysToShow} 
          skipDays={skipDays} 
        />
      </div>
    </div>
  );
}
