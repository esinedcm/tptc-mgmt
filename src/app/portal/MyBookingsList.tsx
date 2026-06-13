'use client';

import React, { useState } from 'react';

type Booking = {
  id: string;
  court: { name: string };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  recurringGroupId?: string | null;
  organizerId: string;
};

export default function MyBookingsList({ 
  initialBookings, 
  cutoffMinutes,
  currentUserId
}: { 
  initialBookings: Booking[], 
  cutoffMinutes: number,
  currentUserId: string
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const now = new Date();

  const groupBookings = (bookingList: Booking[], sortDesc = false) => {
    const grouped: Record<string, Booking & { count: number, courts: Set<string>, dates: Set<string> }> = {};
    
    // Sort bookings by time first to ensure we grab the earliest (or latest for past) instance
    const sortedList = [...bookingList].sort((a, b) => 
      sortDesc ? new Date(b.startTime).getTime() - new Date(a.startTime).getTime() 
               : new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    sortedList.forEach(b => {
      // Group by recurring group or fallback to same time/type/status
      const key = b.recurringGroupId || `${b.startTime}-${b.endTime}-${b.type}-${b.status}`;
      const dateStr = new Date(b.startTime).toDateString();
      if (!grouped[key]) {
        grouped[key] = { ...b, count: 1, courts: new Set([b.court.name]), dates: new Set([dateStr]) };
      } else {
        grouped[key].count += 1;
        grouped[key].courts.add(b.court.name);
        grouped[key].dates.add(dateStr);
      }
    });

    return Object.values(grouped);
  };

  const activeBookings = groupBookings(bookings.filter(b => b.status === 'ACTIVE' && new Date(b.startTime) > now));
  const pastBookings = groupBookings(bookings.filter(b => b.status === 'ACTIVE' && new Date(b.endTime) <= now), true);
  const cancelledBookings = groupBookings(bookings.filter(b => b.status === 'CANCELLED'), true);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
    } catch (err: any) {
      alert(err.message);
    }
    setCancelling(null);
  };

  const renderTable = (bookingsToRender: (Booking & { count?: number, courts?: Set<string>, dates?: Set<string> })[], isActiveList = false, title: string) => {
    if (bookingsToRender.length === 0) {
      return (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">{title}</h3>
          <p className="text-sm text-gray-500 italic">No bookings.</p>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">{title}</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">When</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Court</th>
                {isActiveList && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookingsToRender.map(b => {
                const start = new Date(b.startTime);
                const end = new Date(b.endTime);
                const cutoffTime = new Date(now.getTime() + cutoffMinutes * 60000);
                const canCancel = isActiveList && start >= cutoffTime;

                return (
                  <React.Fragment key={b.id}>
                    <tr className="hover:bg-gray-50 transition-colors border-b-0">
                      <td className="px-3 pt-2 pb-1 text-gray-700 align-top">
                        <div className="font-medium">{start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="text-xs text-gray-500">{start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-3 pt-2 pb-1 text-gray-900 font-medium align-top">
                        {b.courts && b.courts.size > 1 ? 'All' : b.court.name.replace(/^Court\s+/i, '')}
                      </td>
                      {isActiveList && (
                        <td className="px-3 py-2 text-right align-top" rowSpan={2}>
                          <div className="flex flex-col gap-2 justify-center items-end">
                            {b.organizerId === currentUserId ? (
                              <>
                                <button
                                  onClick={() => window.location.href = `/portal/book?edit=${b.id}&date=${start.toISOString().split('T')[0]}`}
                                  className="font-medium text-primary-600 hover:text-primary-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleCancel(b.id)}
                                  disabled={cancelling === b.id || !canCancel}
                                  title={!canCancel ? `Cannot cancel less than ${cutoffMinutes} mins before start.` : ''}
                                  className={`font-medium ${
                                    canCancel 
                                      ? 'text-red-600 hover:text-red-900' 
                                      : 'text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {cancelling === b.id ? 'Cancelling...' : 'Cancel'}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => window.location.href = `/portal/book?view=${b.id}&date=${start.toISOString().split('T')[0]}`}
                                className="font-medium text-primary-600 hover:text-primary-900 bg-primary-50 px-3 py-1 rounded"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td colSpan={2} className="px-3 pb-2 pt-0 border-t-0 text-xs text-gray-500">
                        {b.type} {b.dates && b.dates.size > 1 && <span className="ml-1 text-indigo-600 font-medium">({b.dates.size} instances total)</span>}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderTable(activeBookings, true, 'Active Bookings')}
      {renderTable(pastBookings, false, 'Past Bookings')}
      {cancelledBookings.length > 0 && (
        <div className="opacity-60">
          {renderTable(cancelledBookings, false, 'Cancelled Bookings')}
        </div>
      )}
    </div>
  );
}
