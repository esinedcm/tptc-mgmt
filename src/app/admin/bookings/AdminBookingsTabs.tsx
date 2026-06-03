'use client';

import React, { useState } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import BookingList from '@/components/BookingList';

type Props = {
  currentUserId: string;
  openTime: number;
  closeTime: number;
  daysToShow: number;
  skipDays: number;
};

export default function AdminBookingsTabs({ currentUserId, openTime, closeTime, daysToShow, skipDays }: Props) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  return (
    <div>
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'calendar'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            List View
          </button>
        </nav>
      </div>

      {activeTab === 'calendar' ? (
        <BookingCalendar 
          isAdmin={true} 
          currentUserId={currentUserId} 
          openTime={openTime} 
          closeTime={closeTime} 
          daysToShow={daysToShow} 
          skipDays={skipDays} 
        />
      ) : (
        <BookingList />
      )}
    </div>
  );
}
