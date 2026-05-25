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

  const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
  const maxHours = settings?.maxHoursPerDay ?? 2;
  const maxDays = settings?.maxDaysInAdvance ?? 3;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Book a Court</h1>
        <p className="mt-2 text-sm text-gray-600">
          Members can book up to {maxHours} hours per day, and up to {maxDays} days in advance.
        </p>
      </div>

      <BookingCalendar isAdmin={false} currentUserId={payload.userId as string} />
    </div>
  );
}
