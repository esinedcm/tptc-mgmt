'use client';

import React, { useEffect, useState } from 'react';

type ReleaseNote = {
  hash: string;
  date: string;
  type: string;
  message: string;
};

export function ReleaseNotesWidget() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [lastReadHash, setLastReadHash] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [notesRes, readRes] = await Promise.all([
          fetch('/release-notes.json').catch(() => null),
          fetch('/api/admin/release-notes/read').catch(() => null)
        ]);

        if (notesRes && notesRes.ok) {
          const data = await notesRes.json();
          setNotes(data);
        }

        if (readRes && readRes.ok) {
          const data = await readRes.json();
          setLastReadHash(data.lastReadReleaseHash);
        }
      } catch (e) {
        console.error('Failed to load release notes', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const hasUnread = notes.length > 0 && notes[0].hash !== lastReadHash;

  const handleOpen = async () => {
    setIsOpen(true);
    if (hasUnread && notes.length > 0) {
      const latestHash = notes[0].hash;
      setLastReadHash(latestHash);
      try {
        await fetch('/api/admin/release-notes/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash: latestHash })
        });
      } catch (e) {
        console.error('Failed to mark release notes as read', e);
      }
    }
  };

  if (loading || notes.length === 0) return null;

  return (
    <>
      <button 
        onClick={handleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm"
        title="What's New"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {hasUnread && (
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-red-500"></span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />
            <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex sm:pl-16">
              <div className="w-screen max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                  <div className="p-6 bg-primary-600 sm:p-8">
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-bold text-white">What's New</h2>
                      <div className="ml-3 h-7 flex items-center">
                        <button onClick={() => setIsOpen(false)} className="bg-primary-600 rounded-md text-primary-200 hover:text-white focus:outline-none">
                          <span className="sr-only">Close panel</span>
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-primary-100">
                        The latest updates, fixes, and improvements to your club's portal.
                      </p>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {notes.map((note, noteIdx) => (
                          <li key={note.hash}>
                            <div className="relative pb-8">
                              {noteIdx !== notes.length - 1 ? (
                                <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                              ) : null}
                              <div className="relative flex items-start space-x-3">
                                <div className="relative">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white
                                    ${note.type === 'New Feature' ? 'bg-green-100' : 
                                      note.type === 'Bug Fix' ? 'bg-yellow-100' : 
                                      'bg-blue-100'}`}
                                  >
                                    {note.type === 'New Feature' ? (
                                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : note.type === 'Bug Fix' ? (
                                      <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                    ) : (
                                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1 py-0">
                                  <div className="text-sm font-medium text-gray-900 mb-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2
                                      ${note.type === 'New Feature' ? 'bg-green-100 text-green-800' : 
                                        note.type === 'Bug Fix' ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-blue-100 text-blue-800'}`}
                                    >
                                      {note.type}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-800 font-semibold mb-1">{note.message}</p>
                                  <p className="text-xs text-gray-500">{new Date(note.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
