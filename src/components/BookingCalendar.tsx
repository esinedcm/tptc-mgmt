'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type Court = { id: string; name: string; openTime: number | null; closeTime: number | null };
type User = { id: string; firstName: string; lastName: string; email: string };
type BookingTypeItem = { id: string; name: string; color: string; isBuiltIn: boolean };

type Booking = {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  type: string;
  title?: string | null;
  description?: string | null;
  notes?: string;
  participants: User[];
  organizer: { id: string; firstName: string; lastName: string };
  recurringGroupId?: string;
};

export default function BookingCalendar({ isAdmin, currentUserId, openTime = 6, closeTime = 23, daysToShow = 3, skipDays = 1 }: { isAdmin: boolean; currentUserId: string; openTime?: number; closeTime?: number; daysToShow?: number; skipDays?: number }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const initialDateParam = searchParams.get('date');
  const initialDate = initialDateParam ? new Date(initialDateParam + 'T12:00:00Z') : new Date();

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [bookingType, setBookingType] = useState('MEMBER');
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingDescription, setBookingDescription] = useState('');
  const [availableTypes, setAvailableTypes] = useState<BookingTypeItem[]>([]);
  
  // Advanced Admin Block Booking State
  const [bookAllCourts, setBookAllCourts] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [applyToFuture, setApplyToFuture] = useState(false);
  
  // Member Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);

  // Existing Booking View State
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const [error, setError] = useState('');

  const timeSlots: { hour: number, min: number }[] = [];
  for (let h = openTime; h < closeTime; h++) {
    timeSlots.push({ hour: h, min: 0 });
    timeSlots.push({ hour: h, min: 30 });
  }

  useEffect(() => {
    fetchCourtsAndBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const editParamId = searchParams.get('edit');
  
  useEffect(() => {
    if (editParamId && bookings.length > 0 && !showModal && !editingBookingId) {
      const b = bookings.find(x => x.id === editParamId);
      if (b) {
        setViewBooking(null);
        setEditingBookingId(b.id);
        setSelectedCourtId(b.courtId);
        setSelectedStartTime(new Date(b.startTime));
        setSelectedEndTime(new Date(b.endTime));
        setBookingType(b.type);
        setBookingTitle(b.title || '');
        setBookingDescription(b.description || '');
        setSelectedParticipants(b.participants);
        setShowModal(true);
        router.replace(pathname + (initialDateParam ? `?date=${initialDateParam}` : ''), { scroll: false });
      }
    }
    
    const newParam = searchParams.get('new');
    if (newParam && !showModal && courts.length > 0) {
      setViewBooking(null);
      setEditingBookingId(null);
      setSelectedCourtId(courts[0].id);
      
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(Math.max(openTime, now.getHours() + 1));
      
      const end = new Date(now);
      end.setHours(now.getHours() + 1);
      
      setSelectedStartTime(now);
      setSelectedEndTime(end);
      setBookingType('MEMBER');
      setBookingTitle('');
      setBookingDescription('');
      setSelectedParticipants([]);
      setShowModal(true);
      
      router.replace(pathname + (initialDateParam ? `?date=${initialDateParam}` : ''), { scroll: false });
    }
  }, [editParamId, searchParams, bookings, showModal, editingBookingId, router, pathname, initialDateParam, courts, openTime]);

  const fetchCourtsAndBookings = async () => {
    setLoading(true);
    try {
      const courtsRes = await fetch('/api/courts');
      const courtsData = await courtsRes.json();
      if (courtsData.courts) {
        setCourts(courtsData.courts);
      }

      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + daysToShow - 1);
      end.setHours(23, 59, 59, 999);

      const res = await fetch(`/api/bookings?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await res.json();
      if (data.bookings) {
        setBookings(data.bookings);
      }

      const typesRes = await fetch('/api/booking-types');
      const typesData = await typesRes.json();
      if (typesData.bookingTypes) {
        setAvailableTypes(typesData.bookingTypes);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const res = await fetch(`/api/users?q=${term}`);
    const data = await res.json();
    setSearchResults(data.users || []);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (!selectedCourtId || !selectedStartTime || !selectedEndTime) {
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editingBookingId ? `/api/bookings/${editingBookingId}` : '/api/bookings';
      const method = editingBookingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: selectedCourtId,
          startTime: selectedStartTime.toISOString(),
          endTime: selectedEndTime.toISOString(),
          type: bookingType,
          title: bookingTitle || undefined,
          description: bookingDescription || undefined,
          participantIds: selectedParticipants.map(p => p.id),
          bookAllCourts: isAdmin ? bookAllCourts : undefined,
          applyToFuture: (isAdmin && editingBookingId) ? applyToFuture : undefined,
          recurrence: (isAdmin && isRecurring && !editingBookingId) ? {
            daysOfWeek: recurrenceDays,
            weeks: recurrenceWeeks
          } : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      setShowModal(false);
      setEditingBookingId(null);
      
      if (data.conflicts && data.conflicts.length > 0) {
        alert(`Successfully booked ${data.count} slots, but skipped ${data.conflicts.length} conflicts:\n\n` + data.conflicts.slice(0, 10).join('\n') + (data.conflicts.length > 10 ? '\n...and more' : ''));
      }
      
      // Update URL with the date and reload so they stay on the correct day
      const dateString = selectedStartTime.getFullYear() + '-' + String(selectedStartTime.getMonth() + 1).padStart(2, '0') + '-' + String(selectedStartTime.getDate()).padStart(2, '0');
      window.location.href = `${pathname}?date=${dateString}`;
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    let applyFuture = false;
    if (booking.recurringGroupId && isAdmin) {
      const deleteGroup = confirm('This booking is part of a recurring series.\n\nClick OK to cancel ALL future bookings in this series.\nClick Cancel to ONLY cancel this specific booking.');
      applyFuture = deleteGroup;
      if (!deleteGroup && !confirm('Are you sure you want to cancel just THIS booking?')) return;
    } else {
      if (!confirm('Are you sure you want to cancel this booking?')) return;
    }
    try {
      const res = await fetch(`/api/bookings/${booking.id}?applyToFuture=${applyFuture}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete booking');
      setViewBooking(null);
      fetchCourtsAndBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to get bookings for a specific court, date, and timeslot
  const getBookingForSlot = (courtId: string, cellDate: Date, hour: number, min: number) => {
    return bookings.find(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      
      // Check if booking is on this exact date
      const isSameDate = bStart.getFullYear() === cellDate.getFullYear() && 
                         bStart.getMonth() === cellDate.getMonth() && 
                         bStart.getDate() === cellDate.getDate();
                         
      if (!isSameDate || b.courtId !== courtId) return false;

      const slotTime = hour + min / 60;
      const startTime = bStart.getHours() + bStart.getMinutes() / 60;
      const endTime = bEnd.getHours() + bEnd.getMinutes() / 60;

      return slotTime >= startTime && slotTime < endTime;
    });
  };

  // Rest of UI implementation...
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        {!isAdmin && <h2 className="text-2xl font-bold text-gray-800">Court Schedule</h2>}
        <div className={`flex space-x-4 items-center ${isAdmin ? 'ml-auto' : ''}`}>
          <button 
            onClick={() => { 
              const today = new Date();
              today.setHours(12, 0, 0, 0); // Avoid timezone shifts when formatting to string
              setCurrentDate(today); 
              router.replace(`${pathname}?date=${today.toISOString().split('T')[0]}`, { scroll: false });
            }}
            className="px-3 py-1 bg-primary-50 text-primary-700 font-medium border border-primary-200 rounded hover:bg-primary-100"
          >
            Today
          </button>
          <button 
            onClick={() => { 
              const d = new Date(currentDate); 
              d.setDate(d.getDate() - skipDays); 
              setCurrentDate(d); 
              router.replace(`${pathname}?date=${d.toISOString().split('T')[0]}`, { scroll: false });
            }}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            &larr; Prev
          </button>
          <span className="font-medium text-lg hidden sm:inline-block">
            {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
            {daysToShow > 1 && ` - ${(() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + daysToShow - 1);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            })()}`}
          </span>
          <button 
            onClick={() => { 
              const d = new Date(currentDate); 
              d.setDate(d.getDate() + skipDays); 
              setCurrentDate(d); 
              router.replace(`${pathname}?date=${d.toISOString().split('T')[0]}`, { scroll: false });
            }}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[75vh] border rounded-lg shadow-inner">
        <table className="w-full text-sm text-left border-collapse min-w-[800px] table-fixed relative">
          <thead className="bg-gray-50 border-b sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-3 w-20 border-r bg-gray-50 sticky left-0 z-30" rowSpan={2}>Time</th>
              {Array.from({ length: daysToShow }).map((_, dayOffset) => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() + dayOffset);
                return (
                  <th key={dayOffset} colSpan={courts.length} className="p-2 text-center border-r border-b font-semibold bg-gray-100">
                    {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </th>
                );
              })}
            </tr>
            <tr>
              {Array.from({ length: daysToShow }).map((_, dayOffset) => (
                courts.map(court => (
                  <th key={`${dayOffset}-${court.id}`} className="p-1 text-center border-r font-medium text-xs text-gray-600 bg-gray-50">
                    {court.name}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => (
              <tr key={`${slot.hour}-${slot.min}`} className={`border-b h-8`}>
                <td className="p-2 border-r bg-gray-50 font-medium text-gray-500 text-xs sticky left-0 z-10">
                  {slot.min === 0 && (
                    <span className="absolute -top-3 left-2 bg-gray-50 px-1">
                      {slot.hour === 12 ? '12:00 PM' : slot.hour > 12 ? `${slot.hour - 12}:00 PM` : `${slot.hour}:00 AM`}
                    </span>
                  )}
                </td>
                {Array.from({ length: daysToShow }).map((_, dayOffset) => {
                  const cellDate = new Date(currentDate);
                  cellDate.setDate(cellDate.getDate() + dayOffset);
                  
                  return courts.map(court => {
                    const booking = getBookingForSlot(court.id, cellDate, slot.hour, slot.min);
                    
                    if (booking) {
                      // Is this the first slot of the booking?
                      const bStart = new Date(booking.startTime);
                      const isStart = bStart.getHours() === slot.hour && bStart.getMinutes() === slot.min;
                      if (!isStart) return null; // We'll rowspan the starting cell

                      const durationHours = (new Date(booking.endTime).getTime() - bStart.getTime()) / (1000 * 60 * 60);
                      const rowSpanValue = Math.round(durationHours * 2); // 2 rows per hour
                      
                      const isMyBooking = booking.participants.some(p => p.id === currentUserId) || booking.organizer?.id === currentUserId;
                      
                      const typeInfo = availableTypes.find(t => t.name === booking.type);
                      const baseColor = typeInfo ? typeInfo.color : '#e5e7eb';
                      
                      const myBookingBorder = isMyBooking ? 'border-gray-800 border-2 shadow-sm' : 'border-black/10';
                      
                      return (
                        <td key={`${dayOffset}-${court.id}`} rowSpan={rowSpanValue} className={`border-r align-top relative p-0`}>
                          <div 
                            onClick={() => setViewBooking(booking)}
                            className={`absolute inset-0 m-1 rounded p-1 cursor-pointer hover:opacity-90 overflow-hidden ${myBookingBorder}`}
                            style={{ backgroundColor: baseColor, color: '#1f2937' }}
                          >
                            <div className="font-semibold text-xs truncate" style={{ color: 'inherit' }}>{booking.title || booking.type}</div>
                            <div className="text-[10px] leading-tight truncate" style={{ color: 'inherit', opacity: 0.9 }}>{booking.organizer?.firstName} {booking.organizer?.lastName}</div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td 
                        key={`${dayOffset}-${court.id}`} 
                        className="border-r hover:bg-green-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedCourtId(court.id);
                          const start = new Date(cellDate);
                          start.setHours(slot.hour, slot.min, 0, 0);
                          setSelectedStartTime(start);
                          
                          const end = new Date(cellDate);
                          end.setHours(slot.hour + 1, slot.min, 0, 0);
                          setSelectedEndTime(end);
                          
                          setBookingType('MEMBER');
                          setBookingTitle('');
                          setBookingDescription('');
                          setSelectedParticipants([]);
                          setEditingBookingId(null);
                          setBookAllCourts(false);
                          setIsRecurring(false);
                          setRecurrenceDays([cellDate.getDay()]);
                          setApplyToFuture(false);
                          setError('');
                          setShowModal(true);
                        }}
                      >
                        <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 text-green-600 font-medium text-xs">
                          +
                        </div>
                      </td>
                    );
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingBookingId ? 'Edit Booking' : 'New Booking'}</h3>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Court</label>
                <select
                  required
                  value={selectedCourtId}
                  onChange={e => setSelectedCourtId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                  disabled={bookAllCourts}
                >
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input 
                  type="date"
                  required
                  value={selectedStartTime ? selectedStartTime.getFullYear() + '-' + String(selectedStartTime.getMonth() + 1).padStart(2, '0') + '-' + String(selectedStartTime.getDate()).padStart(2, '0') : ''}
                  onChange={(e) => {
                    if (!selectedStartTime || !selectedEndTime) return;
                    const dateParts = e.target.value.split('-');
                    if (dateParts.length !== 3) return;
                    
                    const year = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]) - 1;
                    const day = parseInt(dateParts[2]);

                    const newStart = new Date(selectedStartTime);
                    newStart.setFullYear(year, month, day);
                    setSelectedStartTime(newStart);
                    
                    const newEnd = new Date(selectedEndTime);
                    newEnd.setFullYear(year, month, day);
                    setSelectedEndTime(newEnd);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {(() => {
                    const selectedCourtInfo = courts.find(c => c.id === selectedCourtId);
                    const dynamicOpenHour = selectedCourtInfo?.openTime ?? openTime;
                    const dynamicCloseHour = selectedCourtInfo?.closeTime ?? closeTime;
                    const minTime = `${String(dynamicOpenHour).padStart(2, '0')}:00`;
                    const maxTime = `${String(dynamicCloseHour).padStart(2, '0')}:00`;
                    
                    return (
                      <>
                        <label className="block text-sm font-medium text-gray-700">Start Time</label>
                        <input 
                          type="time" 
                          required
                          min={minTime}
                          max={maxTime}
                          value={selectedStartTime ? `${String(selectedStartTime.getHours()).padStart(2, '0')}:${String(selectedStartTime.getMinutes()).padStart(2, '0')}` : ''}
                          onChange={(e) => {
                            if (!selectedStartTime || !e.target.value) return;
                            const parts = e.target.value.split(':');
                            if (parts.length < 2) return;
                            const [h, m] = parts;
                            const d = new Date(selectedStartTime);
                            d.setHours(parseInt(h), parseInt(m), 0, 0);
                            setSelectedStartTime(d);
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                        />
                      </>
                    );
                  })()}
                </div>
                <div>
                  {(() => {
                    const selectedCourtInfo = courts.find(c => c.id === selectedCourtId);
                    const dynamicOpenHour = selectedCourtInfo?.openTime ?? openTime;
                    const dynamicCloseHour = selectedCourtInfo?.closeTime ?? closeTime;
                    const minTime = `${String(dynamicOpenHour).padStart(2, '0')}:00`;
                    const maxTime = `${String(dynamicCloseHour).padStart(2, '0')}:00`;

                    return (
                      <>
                        <label className="block text-sm font-medium text-gray-700">End Time</label>
                        <input 
                          type="time" 
                          required
                          min={minTime}
                          max={maxTime}
                          value={selectedEndTime ? `${String(selectedEndTime.getHours()).padStart(2, '0')}:${String(selectedEndTime.getMinutes()).padStart(2, '0')}` : ''}
                          onChange={(e) => {
                            if (!selectedEndTime || !e.target.value) return;
                            const parts = e.target.value.split(':');
                            if (parts.length < 2) return;
                            const [h, m] = parts;
                            const d = new Date(selectedEndTime);
                            d.setHours(parseInt(h), parseInt(m), 0, 0);
                            setSelectedEndTime(d);
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                        />
                      </>
                    );
                  })()}
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-4 border border-primary-100 bg-primary-50 p-4 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Booking Type</label>
                    <select 
                      value={bookingType} 
                      onChange={(e) => setBookingType(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white"
                    >
                      {availableTypes.map(t => (
                        <option key={t.id} value={t.name}>{t.name} {t.isBuiltIn && t.name === 'MEMBER' ? '(Member Play)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title (Optional)</label>
                    <input 
                      type="text" 
                      value={bookingTitle} 
                      onChange={(e) => setBookingTitle(e.target.value)}
                      placeholder="e.g., Men's Finals"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea 
                      value={bookingDescription} 
                      onChange={(e) => setBookingDescription(e.target.value)}
                      placeholder="Visible to all users viewing the calendar..."
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white"
                    />
                  </div>

                  {!editingBookingId && (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          id="bookAllCourts"
                          type="checkbox"
                          checked={bookAllCourts}
                          onChange={(e) => setBookAllCourts(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="bookAllCourts" className="ml-2 block text-sm font-medium text-gray-900">
                          Book all courts
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="isRecurring"
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-900">
                          Make this a recurring block booking
                        </label>
                      </div>

                      {isRecurring && (
                        <div className="pl-6 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Days of the Week</label>
                            <div className="flex flex-wrap gap-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    if (recurrenceDays.includes(idx)) {
                                      setRecurrenceDays(recurrenceDays.filter(d => d !== idx));
                                    } else {
                                      setRecurrenceDays([...recurrenceDays, idx]);
                                    }
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded-full border ${recurrenceDays.includes(idx) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Weeks</label>
                            <input
                              type="number"
                              min="1"
                              max="52"
                              value={recurrenceWeeks}
                              onChange={(e) => setRecurrenceWeeks(parseInt(e.target.value) || 1)}
                              className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 border sm:text-sm bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && editingBookingId && bookings.find(b => b.id === editingBookingId)?.recurringGroupId && (
                <div className="space-y-4 border border-indigo-100 bg-indigo-50 p-4 rounded-md">
                  <div className="flex items-center">
                    <input
                      id="applyToFuture"
                      type="checkbox"
                      checked={applyToFuture}
                      onChange={(e) => setApplyToFuture(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="applyToFuture" className="ml-2 block text-sm font-medium text-gray-900">
                      Apply changes to all future bookings in this recurring series
                    </label>
                  </div>
                </div>
              )}

              {bookingType === 'MEMBER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Add Playing Partners</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="flex-1 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="mt-1 border border-gray-400 rounded-md max-h-40 overflow-y-auto bg-white absolute w-full max-w-sm z-10 shadow-lg">
                      {searchResults.map(user => (
                        <li 
                          key={user.id} 
                          className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                          onClick={() => {
                            if (!selectedParticipants.find(p => p.id === user.id) && user.id !== currentUserId) {
                              setSelectedParticipants([...selectedParticipants, user]);
                            }
                            setSearchTerm('');
                            setSearchResults([]);
                          }}
                        >
                          {user.firstName} {user.lastName} ({user.email})
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {selectedParticipants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedParticipants.map(p => (
                        <span key={p.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {p.firstName} {p.lastName}
                          <button 
                            type="button" 
                            onClick={() => setSelectedParticipants(selectedParticipants.filter(sp => sp.id !== p.id))}
                            className="ml-1 text-primary-500 hover:text-primary-700 focus:outline-none"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setEditingBookingId(null);
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
                >
                  {isSubmitting ? 'Saving...' : (editingBookingId ? 'Save Changes' : 'Confirm Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Booking Details</h3>
            
            <div className="space-y-3 mb-6 text-sm">
              <p><strong>Title:</strong> {viewBooking.title || viewBooking.type}</p>
              {viewBooking.description && (
                <div>
                  <strong>Description:</strong> 
                  <p className="whitespace-pre-wrap mt-1 text-gray-700 border-l-2 border-gray-200 pl-3">{viewBooking.description}</p>
                </div>
              )}
              <p><strong>Time:</strong> {new Date(viewBooking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(viewBooking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <p><strong>Organizer:</strong> {viewBooking.organizer.firstName} {viewBooking.organizer.lastName}</p>
              <p><strong>Participants:</strong> {viewBooking.participants.map(p => `${p.firstName} ${p.lastName}`).join(', ')}</p>
              {viewBooking.notes && <p><strong>Notes:</strong> {viewBooking.notes}</p>}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              {(isAdmin || viewBooking.organizer.id === currentUserId) && (
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedCourtId(viewBooking.courtId);
                    setSelectedStartTime(new Date(viewBooking.startTime));
                    setSelectedEndTime(new Date(viewBooking.endTime));
                    setBookingType(viewBooking.type);
                    setBookingTitle(viewBooking.title || '');
                    setBookingDescription(viewBooking.description || '');
                    setSelectedParticipants(viewBooking.participants);
                    setEditingBookingId(viewBooking.id);
                    setApplyToFuture(false);
                    setViewBooking(null);
                    setShowModal(true);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Edit Booking
                </button>
              )}
              {(isAdmin || viewBooking.organizer.id === currentUserId) && (
                <button 
                  type="button" 
                  onClick={() => handleDeleteBooking(viewBooking)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Cancel Booking
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setViewBooking(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
