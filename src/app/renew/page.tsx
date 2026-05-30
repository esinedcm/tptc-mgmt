'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RegistrationForm } from '@/components/RegistrationForm';

function RenewPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Renew Your Membership</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Please review and update your household details below to renew for the upcoming season.
        </p>
      </div>

      <RegistrationForm initialRenewalToken={token || undefined} />
    </div>
  );
}

export default function RenewPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500 font-medium">Loading...</div>}>
      <RenewPageContent />
    </Suspense>
  );
}
