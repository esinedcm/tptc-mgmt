import React from 'react';

export default function CalendarPage() {
  const calendarId = "8436ab1796810161e2828b507d139d92319ebe88cec1aaa994d91d0ba0fc86f2@group.calendar.google.com";
  
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Club Calendar</h1>
      </div>
      
      <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-200 min-h-[600px]">
        <iframe
          src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America/New_York`}
          style={{ border: 0 }}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          title="Club Google Calendar"
          className="rounded"
        ></iframe>
      </div>
    </div>
  );
}
