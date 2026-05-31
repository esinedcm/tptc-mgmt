'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

type User = {
  id: string;
  firstName: string;
  lastName: string;
};

type Booking = {
  id: string;
  startTime: string;
  endTime: string;
  organizerId: string | null;
  organizer: User | null;
  participants: User[];
};

type MemberStat = {
  id: string;
  name: string;
  timesOrganized: number;
  timesParticipated: number;
  totalTimesPlayed: number;
  totalHoursBooked: number;
};

export default function BookingsReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: keyof MemberStat; direction: 'asc' | 'desc' }>({
    key: 'totalHoursBooked',
    direction: 'desc'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/bookings?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const memberStats = useMemo(() => {
    const statsMap = new Map<string, MemberStat>();

    const getOrCreateStat = (user: User) => {
      if (!statsMap.has(user.id)) {
        statsMap.set(user.id, {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          timesOrganized: 0,
          timesParticipated: 0,
          totalTimesPlayed: 0,
          totalHoursBooked: 0,
        });
      }
      return statsMap.get(user.id)!;
    };

    let totalHours = 0;

    bookings.forEach(booking => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      totalHours += hours;

      if (booking.organizer) {
        const stat = getOrCreateStat(booking.organizer);
        stat.timesOrganized += 1;
        stat.totalHoursBooked += hours;
      }

      booking.participants.forEach(participant => {
        // Prevent double counting if organizer is also listed as participant
        if (participant.id !== booking.organizerId) {
          const stat = getOrCreateStat(participant);
          stat.timesParticipated += 1;
        }
      });
    });

    // Calculate total times played
    statsMap.forEach(stat => {
      stat.totalTimesPlayed = stat.timesOrganized + stat.timesParticipated;
    });

    return {
      stats: Array.from(statsMap.values()),
      totalHours
    };
  }, [bookings]);

  const filteredStats = useMemo(() => {
    let result = memberStats.stats;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(lowerQuery));
    }

    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [memberStats.stats, searchQuery, sortConfig]);

  const handleSort = (key: keyof MemberStat) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof MemberStat }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1 text-primary-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/admin/reports" className="text-sm font-medium text-primary-600 hover:text-primary-700">Reports Hub</Link>
              <span className="text-gray-400">/</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Court Booking Usage</h1>
            <p className="mt-1 text-sm text-gray-500">Analyze court utilization and track member booking statistics.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-400 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Member Name</label>
              <input 
                type="text" 
                placeholder="Search names..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-400 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : bookings.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-md">
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-400 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Hours Booked</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : memberStats.totalHours.toFixed(1)} <span className="text-lg text-gray-500 font-normal">hrs</span></p>
            </div>
            <div className="bg-blue-100 p-3 rounded-md">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-400 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Usage By Member</h3>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading data...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">{error}</div>
          ) : filteredStats.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No data found for the selected date range.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                      Member Name <SortIcon columnKey="name" />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalHoursBooked')}>
                      Hours Booked <SortIcon columnKey="totalHoursBooked" />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('timesOrganized')}>
                      Organized <SortIcon columnKey="timesOrganized" />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('timesParticipated')}>
                      Participated <SortIcon columnKey="timesParticipated" />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors bg-gray-100 font-bold" onClick={() => handleSort('totalTimesPlayed')}>
                      Total Played <SortIcon columnKey="totalTimesPlayed" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStats.map((stat) => (
                    <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {stat.totalHoursBooked.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {stat.timesOrganized}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {stat.timesParticipated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right bg-gray-50/50">
                        {stat.totalTimesPlayed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
