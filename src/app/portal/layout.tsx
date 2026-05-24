import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-indigo-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-white tracking-tight">Thomson Park Tennis Club</span>
              <div className="hidden md:flex gap-4">
                <Link href="/portal" className="text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</Link>
                <Link href="/portal/book" className="text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Book a Court</Link>
                <Link href="/portal/profile" className="text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">My Profile</Link>
              </div>
            </div>
            <div>
              <SignOutButton />
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
