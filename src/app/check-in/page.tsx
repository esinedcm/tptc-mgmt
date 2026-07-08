'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckInPage() {
  const searchParams = useSearchParams();
  const isPrintMode = searchParams.get('print') === 'true';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requireGps, setRequireGps] = useState(false);

  useEffect(() => {
    if (isPrintMode) return;
    
    // Fetch the active booking
    fetch('/api/check-in')
      .then(res => {
        if (res.status === 401) {
          // Store redirect URL and go to login
          sessionStorage.setItem('redirectAfterLogin', '/check-in');
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return; // Handled by 401 redirect
        if (data.error) {
          setError(data.error);
        } else {
          setBooking(data.booking);
          setRequireGps(data.settings?.requireGpsCheckIn || false);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load check-in data. Are you connected to the internet?');
        setLoading(false);
      });
  }, [isPrintMode]);

  const handleCheckIn = async () => {
    if (!booking) return;
    setCheckingIn(true);
    setError('');

    let lat = null;
    let lng = null;

    if (requireGps) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (err: any) {
        setCheckingIn(false);
        if (err.code === 1) {
          setError('Location access was denied. Please allow location access in your browser settings to check in.');
        } else {
          setError('Could not determine your location. Please ensure GPS is enabled.');
        }
        return;
      }
    }

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, lat, lng })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Check-in failed');
      }
    } catch (err) {
      setError('An error occurred during check-in');
    }
    setCheckingIn(false);
  };

  if (isPrintMode) {
    const checkInUrl = typeof window !== 'undefined' ? `${window.location.origin}/check-in` : '';
    // Use an external API to generate the QR code image for simplicity in the print view
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(checkInUrl)}`;
    
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">Court Check-In</h1>
        <p className="text-2xl text-gray-600 mb-12 max-w-2xl">
          Scan this code with your smartphone camera to check in for your booking.
        </p>
        <div className="p-8 border-4 border-gray-900 rounded-3xl mb-12 shadow-2xl">
          <img src={qrUrl} alt="Check In QR Code" className="w-96 h-96" />
        </div>
        <p className="text-gray-500 text-lg">or visit: <strong>{checkInUrl}</strong></p>
        
        <button 
          onClick={() => window.print()}
          className="mt-16 px-8 py-4 bg-primary-600 text-white font-bold rounded-full text-xl hover:bg-primary-700 print:hidden shadow-lg transition-transform hover:scale-105"
        >
          Print this Sign
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center border border-gray-100">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Court Check-In</h1>
        
        {loading ? (
          <div className="py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Finding your booking...</p>
          </div>
        ) : error ? (
          <div className="py-8">
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 border border-red-100">
              {error}
            </div>
            <Link href="/portal" className="text-primary-600 hover:text-primary-700 font-medium">
              Go to Member Portal
            </Link>
          </div>
        ) : success ? (
          <div className="py-8">
            <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-200 mb-6 shadow-sm">
              <h2 className="text-xl font-bold mb-2">You're Checked In!</h2>
              <p>Have a great time on the courts.</p>
            </div>
            <Link href="/portal" className="inline-block w-full px-6 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Return to Portal
            </Link>
          </div>
        ) : booking ? (
          <div className="py-6">
            <p className="text-gray-600 mb-6">We found your upcoming booking:</p>
            
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-left mb-8">
              <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Court</p>
              <p className="font-bold text-gray-900 text-lg mb-4">{booking.court.name}</p>
              
              <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Time</p>
              <p className="font-bold text-gray-900">
                {new Date(booking.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - 
                {new Date(booking.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>

            {booking.checkedInAt ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl font-medium border border-green-200">
                Already checked in at {new Date(booking.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${
                  checkingIn ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {checkingIn ? (requireGps ? 'Getting Location...' : 'Checking In...') : 'Tap to Check In'}
              </button>
            )}
            
            {requireGps && !booking.checkedInAt && (
              <p className="text-xs text-gray-400 mt-4 flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Location access will be requested
              </p>
            )}
          </div>
        ) : (
          <div className="py-8">
            <p className="text-gray-600 mb-6">You don't have any active or upcoming bookings right now.</p>
            <Link href="/portal" className="inline-block w-full px-6 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Go to Member Portal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
