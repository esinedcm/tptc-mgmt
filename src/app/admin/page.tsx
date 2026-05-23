'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Membership = {
  id: string;
  status: string;
  membershipType: string;
  amountPaid: number | null;
  paymentNotes: string | null;
  paymentRecordedAt: string | null;
  createdAt: string;
  archivedAt?: string;
  user: {
    firstName: string;
    lastName: string;
    memberNumber?: string;
    tagNumber?: string;
    email: string;
    phoneNumber?: string;
    gender?: string;
    streetNumber?: string;
    streetName?: string;
    city?: string;
    postalCode?: string;
    householdId?: string;
  };
};

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  status: string;
  createdAt: string;
};

type MembershipPlan = {
  id: string;
  name: string;
  cost: number;
};

export default function AdminDashboard() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [archived, setArchived] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    amountPaid: 0,
    paymentNotes: '',
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    membershipType: '',
    streetNumber: '',
    streetName: '',
    city: '',
    postalCode: '',
    tagNumber: '',
    amountPaid: 0,
    paymentNotes: '',
    paymentRecordedAt: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Active' | 'Archived'>('Pending');

  // Stats calculation
  const totalMemberships = memberships.length;
  const activeMembershipsCount = memberships.filter(m => m.status === 'Active').length;
  const pendingMembershipsCount = memberships.filter(m => m.status === 'Pending').length;
  const prospectsCount = leads.filter(l => l.status === 'Pending').length;
  
  const femaleCount = memberships.filter(m => m.user.gender === 'Female').length;
  const maleCount = memberships.filter(m => m.user.gender === 'Male').length;

  const membershipTypesCount = memberships.reduce((acc, m) => {
    acc[m.membershipType] = (acc[m.membershipType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredMemberships = (activeTab === 'Archived' ? archived.map(a => ({
    id: a.id,
    status: 'Archived',
    membershipType: a.membershipType,
    amountPaid: a.amountPaid,
    paymentNotes: a.paymentNotes,
    paymentRecordedAt: a.paymentRecordedAt,
    createdAt: a.originalCreatedAt,
    archivedAt: a.archivedAt,
    user: {
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phoneNumber: a.phoneNumber || undefined,
      gender: a.gender || undefined,
      memberNumber: undefined,
      tagNumber: undefined,
      streetNumber: undefined,
      streetName: undefined,
      city: undefined,
      postalCode: undefined,
      householdId: undefined,
    }
  }) as Membership) : memberships).filter(m => {
    if (activeTab !== 'All' && activeTab !== 'Archived' && m.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fn = m.user.firstName.toLowerCase();
      const ln = m.user.lastName.toLowerCase();
      const em = m.user.email.toLowerCase();
      if (!fn.includes(q) && !ln.includes(q) && !em.includes(q)) return false;
    }
    return true;
  });

  const filteredLeads = leads.filter(l => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fn = l.firstName.toLowerCase();
      const ln = l.lastName.toLowerCase();
      const em = l.email.toLowerCase();
      if (!fn.includes(q) && !ln.includes(q) && !em.includes(q)) return false;
    }
    return true;
  });

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const [membershipsRes, archivedRes, leadsRes, plansRes] = await Promise.all([
        fetch('/api/admin/memberships'),
        fetch('/api/admin/archived-memberships'),
        fetch('/api/admin/leads'),
        fetch('/api/plans'),
      ]);
      const membershipsData = await membershipsRes.json();
      const archivedData = await archivedRes.json();
      const leadsData = await leadsRes.json();
      const plansData = await plansRes.json();
      
      if (!membershipsRes.ok) throw new Error(membershipsData.error);
      if (!archivedRes.ok) throw new Error(archivedData.error);
      if (!leadsRes.ok) throw new Error(leadsData.error);
      if (!plansRes.ok) throw new Error(plansData.error);
      
      setMemberships(membershipsData.memberships);
      setArchived(archivedData.archived || []);
      setLeads(leadsData.leads);
      setPlans(plansData.plans);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMemberships();
  }, []);

  const handlePayClick = (m: Membership) => {
    setPayingId(m.id);
    const plan = plans.find(p => p.name === m.membershipType);
    setPayForm({
      amountPaid: plan ? plan.cost : 0,
      paymentNotes: '',
    });
  };

  const handleCancelPay = () => {
    setPayingId(null);
  };

  const handleSavePayment = async (membershipId: string) => {
    try {
      const res = await fetch('/api/admin/memberships/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          membershipId, 
          amountPaid: payForm.amountPaid, 
          paymentNotes: payForm.paymentNotes 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setPayingId(null);
      fetchMemberships();
    } catch (err: unknown) {
      alert('Failed to mark as paid: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleEditClick = (m: Membership) => {
    setEditingId(m.id);
    setEditForm({
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      phoneNumber: m.user.phoneNumber || '',
      gender: m.user.gender || '',
      membershipType: m.membershipType,
      streetNumber: m.user.streetNumber || '',
      streetName: m.user.streetName || '',
      city: m.user.city || '',
      postalCode: m.user.postalCode || '',
      tagNumber: m.user.tagNumber || '',
      amountPaid: m.amountPaid || 0,
      paymentNotes: m.paymentNotes || '',
      paymentRecordedAt: m.paymentRecordedAt ? new Date(m.paymentRecordedAt).toISOString().split('T')[0] : '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/memberships/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setEditingId(null);
      fetchMemberships();
      
      if (data.emailPreviewUrl) {
        // In dev mode, we log this and maybe open it so the admin can see the simulated email
        console.log('Update email sent! Preview:', data.emailPreviewUrl);
        // Optional: window.open(data.emailPreviewUrl, '_blank');
      }
    } catch (err: unknown) {
      alert('Failed to update membership: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteMembership = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this member? This action cannot be undone and will delete their user record.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/memberships/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchMemberships();
    } catch (err: unknown) {
      alert('Failed to delete membership: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this prospect?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchMemberships();
    } catch (err: unknown) {
      alert('Failed to delete prospect: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading memberships...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Manage memberships and track prospects.</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin/bookings"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Manage Bookings
            </Link>
            <button
              onClick={() => window.open('/api/admin/export-emails', '_blank')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Member Emails
            </button>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/admin/login';
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>}

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Total Active Members</p>
            <p className="text-2xl font-bold text-green-600">{activeMembershipsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Pending Payments</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingMembershipsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Prospects</p>
            <p className="text-2xl font-bold text-blue-600">{prospectsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Gender Split</p>
            <p className="text-xl font-bold text-gray-700">
              <span className="text-pink-600">{femaleCount}F</span> / <span className="text-blue-600">{maleCount}M</span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Total Memberships</p>
            <p className="text-2xl font-bold text-indigo-600">{totalMemberships}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
            <p className="text-sm text-gray-500 font-medium">Member Types</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(membershipTypesCount).map(([type, count]) => (
                <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {type}: {count}
                </span>
              ))}
              {Object.keys(membershipTypesCount).length === 0 && <span className="text-sm text-gray-400">No data</span>}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex gap-2">
            {(['Pending', 'Active', 'All', 'Archived'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="w-full md:w-64 relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 mb-12">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Memberships ({activeTab})</h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {filteredMemberships.length} Results
            </span>
          </div>
          
          <div className="overflow-x-auto">
            {filteredMemberships.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No memberships found.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMemberships.map((m) => {
                    const isEditing = editingId === m.id;
                    const isPaying = payingId === m.id;

                    if (isPaying) {
                      return (
                        <tr key={m.id} className="bg-green-50">
                          <td className="px-6 py-4" colSpan={3}>
                            <div className="flex gap-4 items-center">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid ($)</label>
                                <input 
                                  type="number"
                                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32 focus:ring-green-500 focus:border-green-500"
                                  value={payForm.amountPaid}
                                  onChange={e => setPayForm({ ...payForm, amountPaid: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes / E-transfer details</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. e-transfer confirmation #123456"
                                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:ring-green-500 focus:border-green-500"
                                  value={payForm.paymentNotes}
                                  onChange={e => setPayForm({ ...payForm, paymentNotes: e.target.value })}
                                />
                              </div>
                            </div>
                            {m.membershipType === 'Family' && m.user.householdId && (
                              <p className="mt-2 text-xs text-green-700 font-medium">
                                * This will securely apply payment details to all pending family members in this household.
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row justify-end items-center h-full">
                            <button
                              onClick={() => handleSavePayment(m.id)}
                              className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-md text-xs px-4 py-2 transition-colors mt-4"
                            >
                              Confirm Payment
                            </button>
                            <button
                              onClick={handleCancelPay}
                              className="text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-md text-xs px-4 py-2 transition-colors mt-4"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    if (isEditing) {
                      return (
                        <tr key={m.id} className="bg-blue-50">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <input 
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={editForm.firstName}
                                onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                placeholder="First Name"
                              />
                              <input 
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={editForm.lastName}
                                onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                placeholder="Last Name"
                              />
                              <label className="block text-xs font-semibold text-gray-700 mt-2 mb-1">Tag Number</label>
                              <input type="text" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.tagNumber} onChange={e => setEditForm({...editForm, tagNumber: e.target.value})} placeholder="Tag Number" />
                            </div>
                            <div className="mt-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid ($)</label>
                              <input type="number" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.amountPaid} onChange={e => setEditForm({...editForm, amountPaid: parseFloat(e.target.value) || 0})} />
                            </div>
                            <div className="mt-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
                              <input type="date" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.paymentRecordedAt} onChange={e => setEditForm({...editForm, paymentRecordedAt: e.target.value})} />
                            </div>
                            <div className="mt-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes</label>
                              <input type="text" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.paymentNotes} onChange={e => setEditForm({...editForm, paymentNotes: e.target.value})} />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <input 
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={editForm.email}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                placeholder="Email"
                              />
                              <input 
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={editForm.phoneNumber}
                                onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                placeholder="Phone Number"
                              />
                              <select
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full bg-white"
                                value={editForm.gender}
                                onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                              <div className="text-xs font-semibold text-gray-500 mt-1">Household Address</div>
                              <div className="flex gap-2">
                                <input 
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-16"
                                  value={editForm.streetNumber}
                                  onChange={e => setEditForm({ ...editForm, streetNumber: e.target.value })}
                                  placeholder="No."
                                />
                                <input 
                                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                  value={editForm.streetName}
                                  onChange={e => setEditForm({ ...editForm, streetName: e.target.value })}
                                  placeholder="Street"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                  value={editForm.city}
                                  onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                  placeholder="City"
                                />
                                <input 
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                                  value={editForm.postalCode}
                                  onChange={e => setEditForm({ ...editForm, postalCode: e.target.value })}
                                  placeholder="Zip"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {m.membershipType === 'Family' ? (
                              <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200" title="Family memberships cannot be changed individually">
                                Family (Locked)
                              </div>
                            ) : (
                              <select
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={editForm.membershipType}
                                onChange={e => setEditForm({ ...editForm, membershipType: e.target.value })}
                              >
                                <option value="Adult">Adult</option>
                                <option value="Junior">Junior</option>
                                <option value="Senior">Senior</option>
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row justify-end items-center">
                            <button
                              onClick={() => handleSaveEdit(m.id)}
                              className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-md text-xs px-3 py-1.5 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-md text-xs px-3 py-1.5 transition-colors"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-medium text-gray-900">{m.user.firstName} {m.user.lastName}</div>
                            {m.user.memberNumber && (
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-200">
                                #{m.user.memberNumber}
                              </span>
                            )}
                            {m.user.tagNumber && (
                              <span className="bg-green-50 text-green-700 text-[10px] font-mono px-2 py-0.5 rounded border border-green-200" title="Tag Number">
                                Tag: {m.user.tagNumber}
                              </span>
                            )}
                            {m.membershipType === 'Family' && m.user.householdId && (
                              <span className="bg-purple-50 text-purple-700 text-[10px] font-mono px-2 py-0.5 rounded border border-purple-200" title="Family Group Identifier">
                                Group: {m.user.householdId.substring(0, 6).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">Registered {new Date(m.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div>{m.user.email}</div>
                          {m.user.phoneNumber && <div className="text-gray-400 mt-1">{m.user.phoneNumber}</div>}
                          {(m.user.streetNumber || m.user.streetName) && (
                            <div className="text-gray-400 mt-2 text-xs truncate max-w-[200px]" title={`${m.user.streetNumber} ${m.user.streetName}, ${m.user.city} ${m.user.postalCode}`}>
                              {m.user.streetNumber} {m.user.streetName}<br/>
                              {m.user.city}, {m.user.postalCode}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {m.membershipType}
                          </span>
                          {m.archivedAt && (
                            <div className="text-xs text-red-500 mt-2 font-medium">
                              Deleted on: {new Date(m.archivedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {activeTab !== 'Archived' && (
                            <button
                              onClick={() => handleEditClick(m)}
                              className="text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-md text-sm px-4 py-2 transition-colors mr-2"
                            >
                              Edit
                            </button>
                          )}
                          {activeTab !== 'Archived' && m.status !== 'Active' && (
                            <button
                              onClick={() => handlePayClick(m)}
                              className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-md text-sm px-4 py-2 transition-colors mr-2"
                            >
                              Mark as Paid
                            </button>
                          )}
                          {activeTab !== 'Archived' && (
                            <button
                              onClick={() => handleDeleteMembership(m.id)}
                              className="text-white bg-red-600 hover:bg-red-700 font-medium rounded-md text-sm px-4 py-2 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                          {activeTab === 'Archived' && (
                            <span className="text-gray-400 text-sm italic">Archived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {!(searchQuery && filteredLeads.length === 0) && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 mt-8">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Prospects (Leads)</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {filteredLeads.length} Pending
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No prospects found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lead.email}</div>
                        {lead.phoneNumber && <div className="text-sm text-gray-500">{lead.phoneNumber}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {lead.status !== 'Converted' && (
                          <Link
                            href={`/register?leadId=${lead.id}`}
                            className="text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-md text-sm px-4 py-2 shadow-sm transition-colors mr-2"
                          >
                            Register
                          </Link>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-white bg-red-600 hover:bg-red-700 font-medium rounded-md text-sm px-4 py-2 shadow-sm transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
