'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  color: string;
  type: string;
};

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calculate grid
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Backtrack to previous Sunday
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Forward to next Saturday
  const endDate = new Date(endOfMonth);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  }

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const s = startDate.toISOString();
      const e = endDate.toISOString();
      const res = await fetch(`/api/calendar?start=${s}&end=${e}`);
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const todayMonth = () => setCurrentDate(new Date());

  // Generate calendar days
  const days = [];
  let d = new Date(startDate);
  while (d <= endDate) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Helper to get events for a day
  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end);
      
      // Zero out times for date comparison
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      
      // If event overlaps with this day
      return eStart < dayEnd && eEnd > dayStart;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 0.5cm; }
        }
      `}} />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 print:mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight print:text-2xl">
            {process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club"} Club Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 print:hidden">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} - Club Events & Schedules
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0 print:hidden">
          <div className="flex items-center rounded-md shadow-sm">
            <button onClick={prevMonth} className="px-3 py-2 border border-gray-300 rounded-l-md bg-white hover:bg-gray-50">
              &larr;
            </button>
            <button onClick={todayMonth} className="px-4 py-2 border-t border-b border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium">
              Today
            </button>
            <button onClick={nextMonth} className="px-3 py-2 border border-gray-300 rounded-r-md bg-white hover:bg-gray-50">
              &rarr;
            </button>
          </div>

          <a 
            href="/api/calendar/feed.ics"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Subscribe (iCal)
          </a>
          
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50 print:hidden"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-4 print:hidden">{error}</div>}

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg print:shadow-none print:ring-gray-300">
        <div className="grid grid-cols-7 gap-px border-b border-gray-200 bg-gray-200 print:border-black print:bg-black">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide print:bg-white print:text-black">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 print:bg-black">
          {days.map((day, dayIdx) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = getEventsForDay(day);

            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[120px] bg-white p-2 print:min-h-[100px] ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 print:bg-gray-100' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center print:bg-white print:text-black print:border-2 print:border-black' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </span>
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[100px] print:max-h-none print:overflow-visible scrollbar-hide">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      title={event.title}
                      className="px-2 py-1 text-xs rounded-sm truncate print:border print:border-black print:bg-transparent print:text-black print:font-semibold"
                      style={{ 
                        backgroundColor: `${event.color}20`,
                        borderLeft: `3px solid ${event.color}`,
                        color: event.color
                      }}
                    >
                      {!event.isAllDay && <span className="font-semibold mr-1 print:hidden">{new Date(event.start).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase()}</span>}
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
