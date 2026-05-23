'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  
  const [token] = useState(tokenParam || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(!tokenParam ? 'error' : 'idle');
  const [message, setMessage] = useState(!tokenParam ? 'Invalid or missing reset token.' : '');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setStatus('success');
      setMessage('Password successfully reset. You can now log in.');
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    }
  };

  if (!token && status === 'error') {
    return (
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center space-y-4">
        <div className="text-red-600 bg-red-50 p-4 rounded-md">{message}</div>
        <Link href="/forgot-password" className="text-indigo-600 font-medium block hover:text-indigo-500">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {status === 'success' ? (
        <div className="text-center space-y-4">
          <div className="bg-green-50 text-green-700 p-4 rounded-md">
            {message}
          </div>
          <div className="pt-2">
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Go to login
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
              {message}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1">
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {status === 'loading' ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create New Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
