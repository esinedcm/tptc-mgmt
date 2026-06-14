'use client';

import React, { useState, useEffect } from 'react';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true to avoid hydration mismatch
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    const dismissed = localStorage.getItem('feedbackWidgetDismissed');
    if (!dismissed) {
      setIsDismissed(false);
    }
    
    // Listen for custom event to open widget from footer
    const handleOpenFeedback = () => {
      setIsDismissed(false);
      setIsOpen(true);
      localStorage.removeItem('feedbackWidgetDismissed');
    };

    window.addEventListener('openFeedbackWidget', handleOpenFeedback);
    return () => window.removeEventListener('openFeedbackWidget', handleOpenFeedback);
  }, []);

  if (isDismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    setIsOpen(false);
    localStorage.setItem('feedbackWidgetDismissed', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const payload = {
        name, 
        email, 
        subject, 
        message,
        appVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
        userAgent: window.navigator.userAgent
      };
      
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      setStatus('success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setIsOpen(false);
        setStatus('idle');
      }, 3000);
    } catch (error) {
      setStatus('error');
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-primary-700 transition-all font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          Feedback
        </button>
        <button 
          onClick={handleDismiss}
          className="bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full shadow-md transition-colors"
          title="Dismiss completely"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="bg-primary-600 text-white p-4 flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          Send Feedback
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-primary-100 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div className="p-4">
        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p className="text-gray-800 font-medium">Thank you!</p>
            <p className="text-gray-500 text-sm mt-1">Your feedback has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="bg-red-50 text-red-600 text-xs p-2 rounded">Failed to send feedback. Please try again.</div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name (Optional)</label>
              <input 
                type="text"
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
              <input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="" disabled>Select a topic...</option>
                <option value="Bug Report">Report a Bug</option>
                <option value="Feature Request">Feature Request</option>
                <option value="General Feedback">General Feedback</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Tell us what you think..."
                required
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={status === 'submitting'}
              className="w-full bg-primary-600 text-white font-medium py-2 rounded shadow hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
