'use client';

import React, { useState, useEffect, useMemo } from 'react';

type Court = { id: string; name: string };
type User = { id: string; firstName: string; lastName: string };
type Booking = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  title?: string | null;
  description?: string | null;
  recurringGroupId?: string | null;
  court: Court;
  organizer: User;
};

export default function BookingList() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to a month ago to see recent entries
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6); // 6 months out
    return d.toISOString().split('T')[0];
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/bookings?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [startDate, endDate]);

  const groupedBookings = useMemo(() => {
    const groups: Record<string, {
      ids: string[];
      recurringGroupId: string | null;
      startTime: string;
      endTime: string;
      type: string;
      title: string;
      courts: Set<string>;
      instances: number;
      uniqueDates: Set<string>;
      organizerName: string;
    }> = {};

    bookings.forEach(b => {
      // Group by recurring group OR by exact time/title combo for single-day blocks
      let key = b.recurringGroupId ? b.recurringGroupId : `${b.startTime}-${b.endTime}-${b.title || b.type}`;
      
      if (!groups[key]) {
        groups[key] = {
          ids: [],
          recurringGroupId: b.recurringGroupId || null,
          startTime: b.startTime,
          endTime: b.endTime,
          type: b.type,
          title: b.title || b.type,
          courts: new Set(),
          instances: 0,
          uniqueDates: new Set(),
          organizerName: b.organizer ? `${b.organizer.firstName} ${b.organizer.lastName}` : 'Unknown'
        };
      }
      
      groups[key].ids.push(b.id);
      groups[key].courts.add(b.court.name);
      groups[key].uniqueDates.add(new Date(b.startTime).toDateString());
      
      // Keep the earliest start time for sorting
      if (new Date(b.startTime) < new Date(groups[key].startTime)) {
        groups[key].startTime = b.startTime;
      }
    });

    return Object.values(groups).map(g => {
      // Sort the courts for nice display
      const sortedCourts = Array.from(g.courts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return {
        ...g,
        courtsList: sortedCourts.join(', '),
        instances: g.uniqueDates.size,
        startDateObj: new Date(g.startTime)
      };
    }).sort((a, b) => a.startDateObj.getTime() - b.startDateObj.getTime());
  }, [bookings]);

  const handleDeleteGroup = async (group: any) => {
    const msg = group.recurringGroupId 
      ? 'Are you sure you want to delete this recurring booking series? All instances from this date forward will be deleted.'
      : 'Are you sure you want to delete this booking block?';
      
    if (!confirm(msg)) return;
    
    try {
      if (group.recurringGroupId) {
        // Delete by first ID and applyToFuture to delete the series
        await fetch(`/api/bookings/${group.ids[0]}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applyToFuture: true })
        });
      } else {
        // Multi-court or single booking on one day without recurrence
        for (const id of group.ids) {
          await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
        }
      }
      fetchBookings();
    } catch (e) {
      alert('Error deleting bookings');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-end bg-gray-50 rounded-t-lg">
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">From Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">To Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading bookings...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">First Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Time</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Title / Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Courts</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Instances</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedBookings.map((g, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {g.startDateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {g.startDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                    {new Date(g.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{g.title}</td>
                  <td className="px-6 py-4 text-gray-600">{g.courtsList}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{g.instances}</span> {g.instances === 1 ? 'booking' : 'weeks'}
                    {g.recurringGroupId && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Series</span>}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleDeleteGroup(g)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
              {groupedBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No bookings found in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
