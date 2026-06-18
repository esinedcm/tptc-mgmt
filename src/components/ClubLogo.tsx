'use client';

import React, { useState } from 'react';

export function ClubLogo() {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = (typeof window !== 'undefined' && (window as any).CLUB_LOGO_URL) 
    ? (window as any).CLUB_LOGO_URL 
    : (process.env.NEXT_PUBLIC_CLUB_LOGO_URL || '/logo.png');

  if (!logoError) {
    return (
      <img 
        src={logoUrl} 
        alt="Club Logo" 
        className="w-16 h-16 object-contain mb-2 mx-auto" 
        onError={() => setLogoError(true)} 
      />
    );
  }

  return (
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-2">
      <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    </div>
  );
}
