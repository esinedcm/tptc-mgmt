'use client';

import React, { useState } from 'react';

type Feedback = {
  id: string;
  name: string | null;
  email: string | null;
  subject: string;
  message: string;
  userAgent: string | null;
  appVersion: string | null;
  status: string;
  createdAt: Date;
};

export default function FeedbackList({ initialFeedback }: { initialFeedback: Feedback[] }) {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>(initialFeedback);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      setFeedbackList(list => list.map(f => f.id === id ? { ...f, status: newStatus } : f));
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setProcessingId(null);
    }
  };

  const activeFeedback = feedbackList.filter(f => f.status !== 'ARCHIVED');
  const archivedFeedback = feedbackList.filter(f => f.status === 'ARCHIVED');

  const renderTable = (items: Feedback[], isArchive: boolean) => {
    if (items.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          No feedback in this section.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Status & Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Sender</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject & Message</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Environment</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const isLongMessage = item.message.length > 150;
              const displayMessage = isLongMessage ? item.message.substring(0, 150) + '...' : item.message;

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2
                      ${item.status === 'NEW' ? 'bg-blue-100 text-blue-800' : 
                        item.status === 'REVIEWED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.status}
                    </span>
                    <div className="text-xs text-gray-500">
                      {mounted ? new Date(item.createdAt).toLocaleString() : new Date(item.createdAt).toISOString().split('T')[0]}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="text-sm font-medium text-gray-900 truncate" title={item.name || 'N/A'}>{item.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500 truncate" title={item.email || 'N/A'}>{item.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 align-top max-w-sm">
                    <div className="text-sm font-semibold text-gray-900 mb-1">{item.subject}</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {displayMessage}
                      {isLongMessage && (
                        <button 
                          onClick={() => setSelectedFeedback(item)}
                          className="ml-2 text-primary-600 hover:text-primary-800 font-medium whitespace-nowrap"
                        >
                          Read More
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="text-xs text-gray-500 mb-1">
                      <span className="font-semibold">v{item.appVersion || 'Unknown'}</span>
                    </div>
                    <div className="text-xs text-gray-400 line-clamp-2" title={item.userAgent || 'Unknown'}>
                      {item.userAgent || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                    <div className="flex flex-col gap-2 items-end">
                      {item.status !== 'REVIEWED' && (
                        <button
                          onClick={() => updateStatus(item.id, 'REVIEWED')}
                          disabled={processingId === item.id}
                          className="text-xs font-medium text-primary-600 hover:text-primary-900 bg-primary-50 px-3 py-1 rounded w-full text-center"
                        >
                          Mark Reviewed
                        </button>
                      )}
                      {!isArchive && (
                        <button
                          onClick={() => updateStatus(item.id, 'ARCHIVED')}
                          disabled={processingId === item.id}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-1 rounded w-full text-center"
                        >
                          Archive
                        </button>
                      )}
                      {isArchive && (
                        <button
                          onClick={() => updateStatus(item.id, 'REVIEWED')}
                          disabled={processingId === item.id}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-1 rounded w-full text-center"
                        >
                          Unarchive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white shadow rounded-lg border border-gray-200 mb-8">
        {renderTable(activeFeedback, false)}
      </div>

      {archivedFeedback.length > 0 && (
        <div className="bg-white shadow rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-lg font-bold text-gray-800">Archive</h2>
          </div>
          {renderTable(archivedFeedback, true)}
        </div>
      )}

      {/* Message Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-gray-900">{selectedFeedback.subject}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  From: {selectedFeedback.name || 'N/A'} {selectedFeedback.email ? `(${selectedFeedback.email})` : ''}
                </p>
              </div>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
              {selectedFeedback.message}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-xl">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
