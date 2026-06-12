'use client';

import React, { useState } from 'react';

type ClubEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  colorHex: string;
  cost: number | null;
  maxParticipants: number | null;
  _count: { registrations: number };
  registrations?: Array<{
    status: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  eventRegistrations: any[];
};

type Props = {
  events: any[];
  currentUser: User;
  householdMembers: any[];
  hasActiveMembership: boolean;
};

export default function EventsListClient({ events, currentUser, householdMembers, hasActiveMembership }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [viewAttendeesEvent, setViewAttendeesEvent] = useState<ClubEvent | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([currentUser.id]);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const handleRegisterClick = (event: ClubEvent) => {
    setSelectedEvent(event);
    setSelectedUsers([currentUser.id]); // Default to self
    setCouponCode(''); // Reset coupon code
  };

  const handleToggleUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleSubmitRegistration = async () => {
    if (!selectedEvent || selectedUsers.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/portal/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          userIds: selectedUsers,
          couponCode: couponCode.trim() || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      alert('Successfully registered!');
      window.location.reload(); // Quick refresh to update state
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="grid gap-6">
        {events.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
            No upcoming events found.
          </div>
        ) : events.map(event => {
          const isRegistered = currentUser.eventRegistrations.some((r: any) => r.eventId === event.id);
          const regRecord = currentUser.eventRegistrations.find((r: any) => r.eventId === event.id);
          
          return (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col sm:flex-row">
              <div className="w-4 sm:w-8 flex-shrink-0" style={{ backgroundColor: event.colorHex }}></div>
              <div className="p-6 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500 mb-2" suppressHydrationWarning>
                    {new Date(event.startDate).toLocaleDateString()} 
                    {!event.isAllDay && ` • ${new Date(event.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                  </p>
                  {event.description && <p className="text-gray-700 text-sm mb-3">{event.description}</p>}
                  
                  <div className="flex flex-wrap gap-3 text-xs">
                    {event.cost !== null && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md font-medium">Cost: ${event.cost.toFixed(2)}</span>
                    )}
                    <button 
                      onClick={() => setViewAttendeesEvent(event)}
                      className="bg-gray-100 text-gray-800 hover:bg-gray-200 px-2 py-1 rounded-md font-medium transition-colors cursor-pointer"
                    >
                      {event.maxParticipants !== null 
                        ? `Capacity: ${event._count.registrations} / ${event.maxParticipants}`
                        : `${event._count.registrations} Attending`
                      }
                    </button>
                  </div>
                </div>
                
                <div className="flex-shrink-0 sm:text-right flex flex-col items-start sm:items-end gap-2">
                  {isRegistered ? (
                    <span className={`inline-flex items-center px-4 py-2 rounded-md font-medium text-sm ${regRecord?.status === 'WAITLISTED' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                      {regRecord?.status === 'WAITLISTED' ? 'On Waitlist' : 'Registered ✓'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRegisterClick(event)}
                      disabled={!hasActiveMembership}
                      title={!hasActiveMembership ? "You must have a paid membership to register" : ""}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm ${!hasActiveMembership ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                    >
                      {hasActiveMembership ? 'Register Now' : 'Membership Payment Required'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold mb-2">Register for {selectedEvent.title}</h2>
            {selectedEvent.cost ? (
              <p className="text-gray-600 mb-6 text-sm">
                This event costs <strong>${selectedEvent.cost.toFixed(2)}</strong> per person. Payment will be collected separately (e.g. at the door).
              </p>
            ) : (
              <p className="text-gray-600 mb-6 text-sm">Select who you want to register for this event.</p>
            )}

            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(currentUser.id)}
                  onChange={() => handleToggleUser(currentUser.id)}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="font-medium text-gray-900">{currentUser.firstName} {currentUser.lastName} (You)</span>
              </label>

              {householdMembers.map(member => (
                <label key={member.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(member.id)}
                    onChange={() => handleToggleUser(member.id)}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <span className="font-medium text-gray-900">{member.firstName} {member.lastName}</span>
                </label>
              ))}
            </div>

            {selectedEvent.cost ? (
              <div className="mb-6 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code (Optional)</label>
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code if you have one"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm py-2 px-3 border"
                />
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRegistration}
                disabled={selectedUsers.length === 0 || loading}
                className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewAttendeesEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 relative max-h-[80vh] flex flex-col">
            <button onClick={() => setViewAttendeesEvent(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl font-bold mb-4 pr-6">Attendees for {viewAttendeesEvent.title}</h2>
            <div className="overflow-y-auto flex-1 pr-2">
              {viewAttendeesEvent.registrations && viewAttendeesEvent.registrations.length > 0 ? (
                <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                  {viewAttendeesEvent.registrations.map((reg, idx) => (
                    <li key={idx} className="py-3 flex justify-between items-center">
                      <span className="font-medium text-gray-900">{reg.user.firstName} {reg.user.lastName}</span>
                      {reg.status === 'WAITLISTED' && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Waitlist</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic text-center py-4">No one has registered yet.</p>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={() => setViewAttendeesEvent(null)}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
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
