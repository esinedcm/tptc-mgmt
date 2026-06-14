'use client';

export function FeedbackFooterLink() {
  return (
    <button 
      onClick={() => window.dispatchEvent(new Event('openFeedbackWidget'))}
      className="hover:text-gray-300 transition-colors"
    >
      Send Feedback
    </button>
  );
}
