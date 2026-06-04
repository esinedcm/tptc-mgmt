'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type ClubEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  colorHex: string;
  cost?: number | null;
  maxParticipants?: number | null;
  _count?: { registrations: number };
};

const getLocalDatetimeString = (isoString: string | undefined, isAllDay: boolean) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (isAllDay) return datePart;
  return `${datePart}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<ClubEvent>>({});
  
  const [viewingRegistrationsEvent, setViewingRegistrationsEvent] = useState<ClubEvent | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = currentEvent.id ? 'PUT' : 'POST';
      const url = currentEvent.id ? `/api/admin/events/${currentEvent.id}` : '/api/admin/events';
      
      const payload = {
        title: currentEvent.title,
        description: currentEvent.description,
        startDate: currentEvent.startDate,
        endDate: currentEvent.endDate,
        isAllDay: currentEvent.isAllDay || false,
        colorHex: currentEvent.colorHex || '#8b5cf6',
        cost: currentEvent.cost,
        maxParticipants: currentEvent.maxParticipants
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save event');
      
      setIsEditing(false);
      setCurrentEvent({});
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete event');
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRegistrations = async (event: ClubEvent) => {
    setViewingRegistrationsEvent(event);
    setRegistrations([]);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations`);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch(e) {}
  };

  const togglePaid = async (regId: string, currentHasPaid: boolean) => {
    try {
      const res = await fetch(`/api/admin/events/registrations/${regId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasPaid: !currentHasPaid })
      });
      if (res.ok) {
        setRegistrations(registrations.map(r => r.id === regId ? { ...r, hasPaid: !currentHasPaid } : r));
      }
    } catch(e) {}
  };

  const openNewEvent = () => {
    setCurrentEvent({
      title: '',
      description: '',
      startDate: new Date().toISOString().slice(0,16),
      endDate: new Date().toISOString().slice(0,16),
      isAllDay: false,
      colorHex: '#8b5cf6',
      cost: null,
      maxParticipants: null
    });
    setIsEditing(true);
  };

  if (loading) return <div className="p-8 text-center">Loading events...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Social Events</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create club-wide events like BBQs or Potlucks to appear on the Member Calendar. (For on-court events like Tournaments, use Court Bookings instead).
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-gray-600 hover:text-gray-900 font-medium flex items-center">
            &larr; Back to Dashboard
          </Link>
          <div className="flex gap-4">
            <Link href="/portal/calendar" className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center bg-indigo-50 px-3 py-1.5 rounded-md">
              View Member Calendar
            </Link>
            <button
              onClick={openNewEvent}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm"
            >
              + Create Event
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {isEditing && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4">{currentEvent.id ? 'Edit Event' : 'New Event'}</h2>
          <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={currentEvent.title || ''}
                onChange={e => setCurrentEvent({...currentEvent, title: e.target.value})}
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type={currentEvent.isAllDay ? "date" : "datetime-local"}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  value={getLocalDatetimeString(currentEvent.startDate, currentEvent.isAllDay || false)}
                  onChange={e => {
                    if (!e.target.value) return;
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setCurrentEvent({...currentEvent, startDate: d.toISOString()});
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type={currentEvent.isAllDay ? "date" : "datetime-local"}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  value={getLocalDatetimeString(currentEvent.endDate, currentEvent.isAllDay || false)}
                  onChange={e => {
                    if (!e.target.value) return;
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setCurrentEvent({...currentEvent, endDate: d.toISOString()});
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Cost ($) - Optional</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  value={currentEvent.cost || ''}
                  onChange={e => setCurrentEvent({...currentEvent, cost: e.target.value ? parseFloat(e.target.value) : null})}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Max Participants - Optional</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  value={currentEvent.maxParticipants || ''}
                  onChange={e => setCurrentEvent({...currentEvent, maxParticipants: e.target.value ? parseInt(e.target.value, 10) : null})}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAllDay"
                checked={currentEvent.isAllDay || false}
                onChange={e => setCurrentEvent({...currentEvent, isAllDay: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isAllDay" className="text-sm text-gray-700">All-day event</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={currentEvent.description || ''}
                onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Calendar Color</label>
              <input
                type="color"
                className="mt-1 block w-16 h-10 rounded-md border border-gray-300 px-1 py-1"
                value={currentEvent.colorHex || '#8b5cf6'}
                onChange={e => setCurrentEvent({...currentEvent, colorHex: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Save Event
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrations</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No upcoming social events found.
                </td>
              </tr>
            ) : events.map(event => (
              <tr key={event.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: event.colorHex }}></div>
                    <div>
                      <div className="font-medium text-gray-900">{event.title}</div>
                      {event.description && <div className="text-sm text-gray-500 truncate max-w-md">{event.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(event.startDate).toLocaleDateString()}
                  {!event.isAllDay && ` • ${new Date(event.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event._count?.registrations || 0} {event.maxParticipants ? `/ ${event.maxParticipants}` : ''} registered
                  {event.cost ? ` • $${event.cost.toFixed(2)}` : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openRegistrations(event)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    View Registrations
                  </button>
                  <button
                    onClick={() => {
                      setCurrentEvent(event);
                      setIsEditing(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewingRegistrationsEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setViewingRegistrationsEvent(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold mb-2">{viewingRegistrationsEvent.title} - Registrations</h2>
            <p className="text-gray-600 mb-6">
              {registrations.length} registered {viewingRegistrationsEvent.maxParticipants ? `out of ${viewingRegistrationsEvent.maxParticipants}` : ''} 
              {viewingRegistrationsEvent.cost ? ` • Cost: $${viewingRegistrationsEvent.cost.toFixed(2)}` : ''}
            </p>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered At</th>
                  {viewingRegistrationsEvent.cost ? <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment</th> : null}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No registrations yet.</td></tr>
                ) : registrations.map(reg => (
                  <tr key={reg.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{reg.user.firstName} {reg.user.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{reg.user.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === 'WAITLISTED' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(reg.registeredAt).toLocaleString()}</td>
                    {viewingRegistrationsEvent.cost ? (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => togglePaid(reg.id, reg.hasPaid)}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${reg.hasPaid ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}
                        >
                          {reg.hasPaid ? 'Paid' : 'Mark Paid'}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
