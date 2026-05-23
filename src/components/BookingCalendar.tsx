'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type Court = { id: string; name: string };
type User = { id: string; firstName: string; lastName: string; email: string };
type Booking = {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string;
  participants: User[];
  organizer: { id: string; firstName: string; lastName: string };
};

export default function BookingCalendar({ isAdmin, currentUserId }: { isAdmin: boolean; currentUserId: string }) {
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
  
  // Member Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);

  // Existing Booking View State
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const [error, setError] = useState('');

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

  useEffect(() => {
    fetchCourtsAndBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

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
      end.setHours(23, 59, 59, 999);

      const res = await fetch(`/api/bookings?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await res.json();
      if (data.bookings) {
        setBookings(data.bookings);
        // Extract real court IDs from bookings if they exist, to map them correctly.
        // Or better yet, we need the real court IDs. Let's fetch them from the bookings. If no bookings, we might not have court IDs. 
        // We will just fetch /api/bookings and we should ideally have a /api/courts route. We will build that next.
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
          participantIds: selectedParticipants.map(p => p.id)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      setShowModal(false);
      setEditingBookingId(null);
      
      // Update URL with the date and reload so they stay on the correct day
      const dateString = currentDate.toISOString().split('T')[0];
      window.location.href = `${pathname}?date=${dateString}`;
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete booking');
      setViewBooking(null);
      fetchCourtsAndBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to get bookings for a specific court and hour
  const getBookingForSlot = (courtId: string, hour: number) => {
    return bookings.find(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return b.courtId === courtId && bStart.getHours() <= hour && bEnd.getHours() > hour;
    });
  };

  // Rest of UI implementation...
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Court Schedule</h2>
        <div className="flex space-x-4 items-center">
          <button 
            onClick={() => { 
              const d = new Date(currentDate); 
              d.setDate(d.getDate() - 1); 
              setCurrentDate(d); 
              router.replace(`${pathname}?date=${d.toISOString().split('T')[0]}`, { scroll: false });
            }}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            &larr; Prev
          </button>
          <span className="font-medium text-lg">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <button 
            onClick={() => { 
              const d = new Date(currentDate); 
              d.setDate(d.getDate() + 1); 
              setCurrentDate(d); 
              router.replace(`${pathname}?date=${d.toISOString().split('T')[0]}`, { scroll: false });
            }}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 w-24 border-r">Time</th>
              {courts.map(court => (
                <th key={court.id} className="p-3 text-center border-r font-semibold">{court.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(hour => (
              <tr key={hour} className="border-b h-16">
                <td className="p-3 border-r bg-gray-50 font-medium text-gray-500">
                  {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                </td>
                {courts.map(court => {
                  const booking = getBookingForSlot(court.id, hour);
                  
                  if (booking) {
                    // Is this the first hour of the booking?
                    const isStart = new Date(booking.startTime).getHours() === hour;
                    if (!isStart) return null; // We'll rowspan the starting cell

                    const durationHours = (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60);
                    
                    const isMyBooking = booking.participants.some(p => p.id === currentUserId) || booking.organizer.id === currentUserId;
                    const bgClass = booking.type === 'LESSON' ? 'bg-purple-100 border-purple-300' :
                                    booking.type === 'LEAGUE' ? 'bg-orange-100 border-orange-300' :
                                    isMyBooking ? 'bg-blue-100 border-blue-300' : 'bg-gray-200 border-gray-300';
                    
                    return (
                      <td key={court.id} rowSpan={durationHours} className={`border-r p-1 align-top`}>
                        <div 
                          onClick={() => setViewBooking(booking)}
                          className={`h-full w-full rounded p-2 border cursor-pointer hover:shadow-md transition-shadow ${bgClass}`}
                        >
                          <div className="font-semibold text-gray-800">{booking.type}</div>
                          <div className="text-xs text-gray-600 truncate">{booking.organizer.firstName} {booking.organizer.lastName}</div>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td 
                      key={court.id} 
                      className="border-r p-2 hover:bg-green-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCourtId(court.id);
                        const start = new Date(currentDate);
                        start.setHours(hour, 0, 0, 0);
                        setSelectedStartTime(start);
                        
                        const end = new Date(currentDate);
                        end.setHours(hour + 1, 0, 0, 0);
                        setSelectedEndTime(end);
                        
                        setBookingType('MEMBER');
                        setSelectedParticipants([]);
                        setEditingBookingId(null);
                        setShowModal(true);
                      }}
                    >
                      <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 text-green-600 font-medium">
                        + Book
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">Book {courts.find(c => c.id === selectedCourtId)?.name}</h3>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input 
                    type="time" 
                    required
                    value={selectedStartTime ? selectedStartTime.toTimeString().slice(0,5) : ''}
                    onChange={(e) => {
                      if (!selectedStartTime) return;
                      const [h, m] = e.target.value.split(':');
                      const d = new Date(selectedStartTime);
                      d.setHours(parseInt(h), parseInt(m));
                      setSelectedStartTime(d);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input 
                    type="time" 
                    required
                    value={selectedEndTime ? selectedEndTime.toTimeString().slice(0,5) : ''}
                    onChange={(e) => {
                      if (!selectedEndTime) return;
                      const [h, m] = e.target.value.split(':');
                      const d = new Date(selectedEndTime);
                      d.setHours(parseInt(h), parseInt(m));
                      setSelectedEndTime(d);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  />
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking Type</label>
                  <select 
                    value={bookingType} 
                    onChange={(e) => setBookingType(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  >
                    <option value="MEMBER">Member Play</option>
                    <option value="LESSON">Lesson</option>
                    <option value="LEAGUE">League Match</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
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
                      className="flex-1 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="mt-1 border border-gray-200 rounded-md max-h-40 overflow-y-auto bg-white absolute w-full max-w-sm z-10 shadow-lg">
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
                        <span key={p.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {p.firstName} {p.lastName}
                          <button 
                            type="button" 
                            onClick={() => setSelectedParticipants(selectedParticipants.filter(sp => sp.id !== p.id))}
                            className="ml-1 text-indigo-500 hover:text-indigo-700 focus:outline-none"
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
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
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
              <p><strong>Type:</strong> {viewBooking.type}</p>
              <p><strong>Time:</strong> {new Date(viewBooking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(viewBooking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <p><strong>Organizer:</strong> {viewBooking.organizer.firstName} {viewBooking.organizer.lastName}</p>
              <p><strong>Participants:</strong> {viewBooking.participants.map(p => `${p.firstName} ${p.lastName}`).join(', ')}</p>
              {viewBooking.notes && <p><strong>Notes:</strong> {viewBooking.notes}</p>}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              {isAdmin && (
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedCourtId(viewBooking.courtId);
                    setSelectedStartTime(new Date(viewBooking.startTime));
                    setSelectedEndTime(new Date(viewBooking.endTime));
                    setBookingType(viewBooking.type);
                    setSelectedParticipants(viewBooking.participants);
                    setEditingBookingId(viewBooking.id);
                    setViewBooking(null);
                    setShowModal(true);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Edit Booking
                </button>
              )}
              {(isAdmin || viewBooking.organizer.id === currentUserId) && (
                <button 
                  type="button" 
                  onClick={() => handleDeleteBooking(viewBooking.id)}
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
