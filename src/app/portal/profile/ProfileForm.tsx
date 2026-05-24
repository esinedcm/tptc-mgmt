'use client';

import React, { useState } from 'react';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';

type ProfileData = {
  phoneNumber: string;
  streetNumber: string;
  streetName: string;
  city: string;
  postalCode: string;
};

export function ProfileForm({ initialData }: { initialData: ProfileData }) {
  const [formData, setFormData] = useState<ProfileData>(initialData);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [fieldErrors, setFieldErrors] = useState({ phoneNumber: '', postalCode: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(false);
    setError('');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'postalCode') {
      if (value && !isValidPostalCode(value)) {
        setFieldErrors(prev => ({ ...prev, postalCode: 'Invalid format (e.g. M1M 1M1)' }));
      } else {
        setFieldErrors(prev => ({ ...prev, postalCode: '' }));
      }
    } else if (name === 'phoneNumber') {
      if (value && !isValidPhoneNumber(value)) {
        setFieldErrors(prev => ({ ...prev, phoneNumber: 'Invalid 10-digit format' }));
      } else {
        setFieldErrors(prev => ({ ...prev, phoneNumber: '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    if (formData.postalCode && !isValidPostalCode(formData.postalCode)) {
      setError('Invalid Postal Code format. Please use a valid Canadian format (e.g. M1M 1M1).');
      setLoading(false);
      return;
    }
    if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber)) {
      setError('Invalid phone number format. Please use a standard 10-digit number.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md">
          Profile updated successfully!
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
        <input
          type="text"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black ${fieldErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
        />
        {fieldErrors.phoneNumber && <span className="text-xs text-red-500 mt-1 block">{fieldErrors.phoneNumber}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Street Number</label>
          <input
            type="text"
            name="streetNumber"
            value={formData.streetNumber}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Street Name</label>
          <input
            type="text"
            name="streetName"
            value={formData.streetName}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black ${fieldErrors.postalCode ? 'border-red-500' : 'border-gray-300'}`}
          />
          {fieldErrors.postalCode && <span className="text-xs text-red-500 mt-1 block">{fieldErrors.postalCode}</span>}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
