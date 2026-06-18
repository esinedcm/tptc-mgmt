import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import { MobileNav } from '@/components/MobileNav';

import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  let isAdmin = false;
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && payload.role === 'ADMIN') {
      isAdmin = true;
    }
  }

  let enableMemberCourtBooking = true;
  let logoUrl = process.env.NEXT_PUBLIC_CLUB_LOGO_URL;
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
    if (settings) {
      enableMemberCourtBooking = settings.enableMemberCourtBooking;
      if (settings.logoUrl) logoUrl = settings.logoUrl;
    }
  } catch (e) {
    console.error('Error fetching settings for layout:', e);
  }

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-primary-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img src={logoUrl} alt="Club Logo" className="h-8 w-auto" />
                )}
                <span className="text-xl font-bold text-white tracking-tight">{process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club"}</span>
              </div>
              <div className="hidden md:flex gap-4">
                <Link href="/portal" className="text-primary-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</Link>
                {(enableMemberCourtBooking || isAdmin) && (
                  <Link href="/portal/book" className="text-primary-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Book a Court</Link>
                )}
                <Link href="/portal/calendar" className="text-primary-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Calendar</Link>
                <Link href="/portal/events" className="text-primary-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Events</Link>
                <Link href="/portal/profile" className="text-primary-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">My Profile</Link>
                {isAdmin && (
                  <Link href="/admin" className="bg-primary-700 text-white hover:bg-primary-800 px-3 py-2 rounded-md text-sm font-bold transition-colors shadow-sm border border-primary-500">
                    Admin Dashboard
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden md:block">
                <SignOutButton />
              </div>
              <MobileNav isAdmin={isAdmin} enableMemberCourtBooking={enableMemberCourtBooking} />
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
