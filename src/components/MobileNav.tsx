'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SignOutButton } from './SignOutButton';

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-primary-100 focus:outline-none p-2 ml-2"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-primary-600 shadow-xl border-t border-primary-500 z-50">
          <div className="flex flex-col px-4 py-3 space-y-2">
            <Link href="/portal" onClick={() => setIsOpen(false)} className="text-white hover:bg-primary-700 px-3 py-2 rounded-md font-medium">Dashboard</Link>
            <Link href="/portal/book" onClick={() => setIsOpen(false)} className="text-white hover:bg-primary-700 px-3 py-2 rounded-md font-medium">Book a Court</Link>
            <Link href="/portal/calendar" onClick={() => setIsOpen(false)} className="text-white hover:bg-primary-700 px-3 py-2 rounded-md font-medium">Calendar</Link>
            <Link href="/portal/events" onClick={() => setIsOpen(false)} className="text-white hover:bg-primary-700 px-3 py-2 rounded-md font-medium">Events</Link>
            <Link href="/portal/profile" onClick={() => setIsOpen(false)} className="text-white hover:bg-primary-700 px-3 py-2 rounded-md font-medium">My Profile</Link>
            {isAdmin && (
              <Link href="/admin" onClick={() => setIsOpen(false)} className="text-primary-100 hover:bg-primary-700 hover:text-white px-3 py-2 rounded-md font-bold border-t border-primary-500 mt-2 pt-2">
                Admin Dashboard
              </Link>
            )}
            <div className="pt-2 border-t border-primary-500 mt-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
