import React from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function BookCourtPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyJwt(token);
  if (!payload || !payload.userId) redirect('/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Book a Court</h1>
        <p className="mt-2 text-sm text-gray-600">
          Members can book up to 2 hours per day, and up to 3 days in advance.
        </p>
      </div>

      <BookingCalendar isAdmin={false} currentUserId={payload.userId as string} />
    </div>
  );
}
