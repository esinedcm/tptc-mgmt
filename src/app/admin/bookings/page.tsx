import React from 'react';
import AdminBookingsTabs from './AdminBookingsTabs';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Admins can create block bookings for lessons or leagues without constraints.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/portal/calendar" className="text-primary-600 hover:text-primary-800 font-semibold flex items-center bg-primary-50 px-3 py-1.5 rounded-md">
            View Member Calendar
          </Link>
          <Link href="/admin/bookings?new=true" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Booking
          </Link>
          <Link 
            href="/admin" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <AdminBookingsTabs 
        currentUserId={payload.userId as string} 
        openTime={openTime} 
        closeTime={closeTime} 
        daysToShow={daysToShow} 
        skipDays={skipDays} 
      />
    </div>
  );
}
