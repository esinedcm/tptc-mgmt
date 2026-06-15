import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import React from 'react';

export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-grow flex flex-col pt-24 pb-16">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
