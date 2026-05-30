'use client';

import React, { useState } from 'react';

type Booking = {
  id: string;
  court: { name: string };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
};

export default function MyBookingsList({ 
  initialBookings, 
  cutoffMinutes 
}: { 
  initialBookings: Booking[], 
  cutoffMinutes: number 
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const now = new Date();

  const activeBookings = bookings.filter(b => b.status === 'ACTIVE' && new Date(b.startTime) > now);
  const pastBookings = bookings.filter(b => b.status === 'ACTIVE' && new Date(b.endTime) <= now);
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

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

  const renderBookingCard = (b: Booking, isActiveList = false) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    
    // Check if within cutoff
    const cutoffTime = new Date(now.getTime() + cutoffMinutes * 60000);
    const canCancel = isActiveList && start >= cutoffTime;

    return (
      <div key={b.id} className="border p-3 rounded-md mb-2 flex justify-between items-center bg-white shadow-sm">
        <div>
          <div className="font-semibold text-gray-800">{b.court.name} - {b.type}</div>
          <div className="text-sm text-gray-600">
            {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
        {isActiveList && (
          <div>
            <button
              onClick={() => handleCancel(b.id)}
              disabled={cancelling === b.id || !canCancel}
              title={!canCancel ? `Cannot cancel less than ${cutoffMinutes} mins before start.` : ''}
              className={`px-3 py-1 text-sm font-medium rounded border ${
                canCancel 
                  ? 'border-red-300 text-red-600 hover:bg-red-50' 
                  : 'border-gray-400 text-gray-400 cursor-not-allowed bg-gray-50'
              }`}
            >
              {cancelling === b.id ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">Active Bookings</h3>
        {activeBookings.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No upcoming bookings.</p>
        ) : (
          activeBookings.map(b => renderBookingCard(b, true))
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">Past Bookings</h3>
        {pastBookings.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No past bookings.</p>
        ) : (
          pastBookings.map(b => renderBookingCard(b, false))
        )}
      </div>

      {cancelledBookings.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1 text-gray-400">Cancelled Bookings</h3>
          <div className="opacity-60">
            {cancelledBookings.map(b => renderBookingCard(b, false))}
          </div>
        </div>
      )}
    </div>
  );
}
