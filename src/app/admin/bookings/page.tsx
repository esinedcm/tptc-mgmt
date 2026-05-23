import React from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminBookingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyJwt(token);
  if (!payload || payload.role !== 'ADMIN') redirect('/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Admins can create block bookings for lessons or leagues without constraints.
        </p>
      </div>

      <BookingCalendar isAdmin={true} currentUserId={payload.userId as string} />
    </div>
  );
}
