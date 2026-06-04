'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminBookingsActions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Mobile Hamburger Button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
        >
          <span className="sr-only">Open actions menu</span>
          {isOpen ? (
            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Desktop Buttons */}
      <div className="hidden md:flex items-center gap-4">
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

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 md:hidden">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <Link 
              href="/portal/calendar" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
              onClick={() => setIsOpen(false)}
            >
              View Member Calendar
            </Link>
            <Link 
              href="/admin/bookings?new=true" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
              onClick={() => setIsOpen(false)}
            >
              New Booking
            </Link>
            <Link 
              href="/admin" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
