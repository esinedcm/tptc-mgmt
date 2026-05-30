'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';

type Membership = {
  id: string;
  status: string;
  membershipType: string;
  amountPaid: number | null;
  paymentNotes: string | null;
  paymentRecordedAt: string | null;
  createdAt: string;
  season?: string;
  archivedAt?: string;
  user: {
    firstName: string;
    lastName: string;
    memberNumber?: string;
    tagNumber?: string;
    email: string;
    phoneNumber?: string;
    role?: string;
    gender?: string;
    dateOfBirth?: string | Date;
    wantsFreeLessons?: boolean;
    streetNumber?: string;
    streetName?: string;
    city?: string;
    postalCode?: string;
    householdId?: string;
    memberships?: { season: string }[];
  };
};

type PastMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  memberNumber?: string;
  memberships: { season: string; membershipType: string; status: string; createdAt: string }[];
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
  const [pastMembers, setPastMembers] = useState<PastMember[]>([]);
  const [activeSeason, setActiveSeason] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [pendingWelcomeCount, setPendingWelcomeCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    role: '',
    gender: '',
    dateOfBirth: '',
    wantsFreeLessons: false,
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
  const [editErrors, setEditErrors] = useState({ phoneNumber: '', postalCode: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Active' | 'Archived' | 'Past Members'>('Pending');

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
      role: undefined,
      gender: a.gender || undefined,
      dateOfBirth: a.dateOfBirth || undefined,
      wantsFreeLessons: a.wantsFreeLessons || false,
      memberNumber: undefined,
      tagNumber: undefined,
      streetNumber: undefined,
      streetName: undefined,
      city: undefined,
      postalCode: undefined,
      householdId: undefined,
    }
  }) as Membership) : memberships).filter(m => {
    if (activeTab !== 'All' && activeTab !== 'Archived' && activeTab !== 'Past Members' && m.status !== activeTab) return false;
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

  const filteredPastMembers = pastMembers.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fn = m.firstName.toLowerCase();
      const ln = m.lastName.toLowerCase();
      const em = m.email.toLowerCase();
      if (!fn.includes(q) && !ln.includes(q) && !em.includes(q)) return false;
    }
    return true;
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [memRes, archRes, leadsRes, plansRes, pastRes, welcomeRes] = await Promise.all([
        fetch('/api/admin/memberships'),
        fetch('/api/admin/archived-memberships'),
        fetch('/api/admin/leads'),
        fetch('/api/plans'),
        fetch('/api/admin/memberships/past'),
        fetch('/api/admin/send-welcome')
      ]);

      const memData = await memRes.json();
      const archData = await archRes.json();
      const leadsData = await leadsRes.json();
      const plansData = await plansRes.json();
      const pastData = await pastRes.json();
      const welcomeData = await welcomeRes.json();

      if (memData.memberships) setMemberships(memData.memberships);
      if (memData.activeSeason) setActiveSeason(memData.activeSeason);
      if (archData.archived) setArchived(archData.archived);
      if (leadsData.leads) setLeads(leadsData.leads);
      if (plansData.plans) setPlans(plansData.plans);
      if (pastData.pastMembers) setPastMembers(pastData.pastMembers);
      if (typeof welcomeData.count === 'number') setPendingWelcomeCount(welcomeData.count);
      
      if (!memRes.ok) throw new Error(memData.error);
      if (!archRes.ok) throw new Error(archData.error);
      if (!leadsRes.ok) throw new Error(leadsData.error);
      if (!plansRes.ok) throw new Error(plansData.error);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      fetchData();
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
      role: m.user.role || 'MEMBER',
      gender: m.user.gender || '',
      dateOfBirth: m.user.dateOfBirth ? new Date(m.user.dateOfBirth).toISOString().split('T')[0] : '',
      wantsFreeLessons: m.user.wantsFreeLessons || false,
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
    setEditErrors({ phoneNumber: '', postalCode: '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditErrors({ phoneNumber: '', postalCode: '' });
  };

  const handleEditBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { placeholder, value } = e.target;
    if (placeholder === 'Zip') {
      if (value && !isValidPostalCode(value)) {
        setEditErrors(prev => ({ ...prev, postalCode: 'Invalid format' }));
      } else {
        setEditErrors(prev => ({ ...prev, postalCode: '' }));
      }
    } else if (placeholder === 'Phone Number') {
      if (value && !isValidPhoneNumber(value)) {
        setEditErrors(prev => ({ ...prev, phoneNumber: 'Invalid 10-digit format' }));
      } else {
        setEditErrors(prev => ({ ...prev, phoneNumber: '' }));
      }
    }
  };

  const handleExportLessons = async () => {
    try {
      const res = await fetch('/api/admin/export-lessons');
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `free-lessons-interest-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export lessons list');
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          alert('Error parsing CSV: ' + results.errors[0].message);
          return;
        }
        
        if (!window.confirm(`Ready to import ${results.data.length} records. Continue?`)) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setImporting(true);
        try {
          const res = await fetch('/api/admin/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(results.data),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          
          alert(`Successfully imported ${data.importedCount} members. Skipped ${data.skippedCount} existing/invalid records.`);
          fetchData();
        } catch (err: any) {
          alert('Import failed: ' + err.message);
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleSendWelcomeEmails = async () => {
    if (!window.confirm(`Are you sure you want to send welcome emails to ${pendingWelcomeCount} members?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/send-welcome', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Sent ${data.sentCount} welcome emails successfully!`);
      fetchData();
    } catch (err: any) {
      alert('Failed to send welcome emails: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (editForm.postalCode && !isValidPostalCode(editForm.postalCode)) {
      alert('Invalid Postal Code format. Please use a valid Canadian format (e.g. M1M 1M1).');
      return;
    }
    if (editForm.phoneNumber && !isValidPhoneNumber(editForm.phoneNumber)) {
      alert('Invalid phone number format. Please use a standard 10-digit number.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/memberships/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setEditingId(null);
      fetchData();
      
      if (data.emailPreviewUrl) {
        console.log('Update email sent! Preview:', data.emailPreviewUrl);
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
      fetchData();
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
      fetchData();
    } catch (err: unknown) {
      alert('Failed to delete prospect: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading memberships...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            {process.env.NEXT_PUBLIC_CLUB_LOGO_URL && (
              <img src={process.env.NEXT_PUBLIC_CLUB_LOGO_URL} alt="Club Logo" className="h-10 w-auto" />
            )}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard<br /> {activeSeason && `${activeSeason} Season`}</h1>
              
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4">
            <Link
              href="/admin/bookings"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Manage Bookings
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reports
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImportCSV} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              title="Required columns: Email, First Name, Last Name. Optional: Phone, Gender, Type, Paid, Household"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
            {pendingWelcomeCount > 0 && (
              <button
                onClick={handleSendWelcomeEmails}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Welcome Emails ({pendingWelcomeCount})
              </button>
            )}
            <button
              onClick={() => window.open('/api/admin/export-emails', '_blank')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Member Emails
            </button>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/';
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-gray-500 font-medium">Total Active Members</p>
            <p className="text-2xl font-bold text-green-600">{activeMembershipsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-gray-500 font-medium">Pending Payments</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingMembershipsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-gray-500 font-medium">Prospects</p>
            <p className="text-2xl font-bold text-blue-600">{prospectsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-gray-500 font-medium">Gender Split</p>
            <p className="text-xl font-bold text-gray-700">
              <span className="text-pink-600">{femaleCount}F</span> / <span className="text-blue-600">{maleCount}M</span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-gray-500 font-medium">Total Memberships</p>
            <p className="text-2xl font-bold text-primary-600">{totalMemberships}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 md:col-span-2">
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

        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-400">
          <nav className="flex space-x-4 border-b border-gray-400">
            {['Pending', 'Active', 'All', 'Archived', 'Past Members'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab} {tab === 'Pending' && pendingMembershipsCount > 0 && `(${pendingMembershipsCount})`}
                {tab === 'Active' && `(${activeMembershipsCount})`}
                {tab === 'All' && `(${totalMemberships})`}
                {tab === 'Archived' && `(${archived.length})`}
                {tab === 'Past Members' && `(${pastMembers.length})`}
              </button>
            ))}
          </nav>
          <div className="flex gap-4 items-center">
            <div className="w-full md:w-64 relative">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
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
            <button
              onClick={handleExportLessons}
              className="px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium rounded-md text-sm border border-orange-200 transition-colors flex items-center gap-2"
            >
              🎾 Export Lessons
            </button>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-400 mb-12">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-400">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Memberships ({activeTab})</h3>
            <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {filteredMemberships.length} Results
            </span>
          </div>
          
          <div className="overflow-x-auto">
            {activeTab !== 'Past Members' && filteredMemberships.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50">
                No memberships found matching your criteria.
              </div>
            ) : activeTab !== 'Past Members' && (
              <table className="min-w-full divide-y divide-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-400">
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
                              <label className="block text-xs font-semibold text-gray-700 mt-2 mb-1">Date of Birth</label>
                              <input 
                                type="date"
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                value={editForm.dateOfBirth}
                                onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
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
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                                  <input 
                                    type="text"
                                    className={`w-full border rounded px-2 py-1 text-sm ${editErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                                    value={editForm.phoneNumber}
                                    onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                    onBlur={handleEditBlur}
                                    placeholder="Phone Number"
                                  />
                                  {editErrors.phoneNumber && <span className="text-red-500 text-xs">{editErrors.phoneNumber}</span>}
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                                  <select 
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    value={editForm.role}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                  >
                                    <option value="MEMBER">Member</option>
                                    <option value="ADMIN">Admin</option>
                                  </select>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 text-blue-600" 
                                  checked={editForm.wantsFreeLessons} 
                                  onChange={e => setEditForm({...editForm, wantsFreeLessons: e.target.checked})} 
                                />
                                <span className="text-xs text-gray-700">Wants Free Lessons</span>
                              </div>
                              {editErrors.phoneNumber && <div className="text-red-500 text-xs mt-1">{editErrors.phoneNumber}</div>}
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
                                  className={`border rounded px-2 py-1 text-sm w-20 ${editErrors.postalCode ? 'border-red-500' : 'border-gray-300'}`}
                                  value={editForm.postalCode}
                                  onChange={e => setEditForm({ ...editForm, postalCode: e.target.value })}
                                  onBlur={handleEditBlur}
                                  placeholder="Zip"
                                />
                              </div>
                              {editErrors.postalCode && <span className="text-xs text-red-500">{editErrors.postalCode}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {m.membershipType === 'Family' ? (
                              <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-400" title="Family memberships cannot be changed individually">
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
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-400">
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
                            {m.user.wantsFreeLessons && (
                              <span className="bg-orange-50 text-orange-700 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-200" title="Wants Free Lessons">
                                🎾 Lessons
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mb-1">Registered {new Date(m.createdAt).toLocaleDateString()}</div>
                          {m.user.dateOfBirth && (
                            <div className="text-xs text-gray-500">
                              DOB: {new Date(m.user.dateOfBirth).toLocaleDateString()} 
                              <span className="text-gray-400 ml-1">
                                ({Math.abs(new Date(Date.now() - new Date(m.user.dateOfBirth).getTime()).getUTCFullYear() - 1970)} yrs)
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-indigo-600 font-semibold mt-1">
                            Tenure: {m.user.memberships ? new Set(m.user.memberships.map((x: any) => x.season)).size : 1} Year(s)
                          </div>
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

            {activeTab === 'Past Members' && filteredPastMembers.length === 0 && (
              <div className="p-8 text-center text-gray-500 bg-gray-50">
                No past members found matching your criteria.
              </div>
            )}
            {activeTab === 'Past Members' && filteredPastMembers.length > 0 && (
              <table className="min-w-full divide-y divide-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Past Memberships</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-400">
                  {filteredPastMembers.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-medium text-gray-900">{m.firstName} {m.lastName}</div>
                          {m.memberNumber && (
                            <span className="w-max bg-gray-100 text-gray-600 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-400">
                              #{m.memberNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>{m.email}</div>
                        {m.phoneNumber && <div className="text-gray-400 mt-1">{m.phoneNumber}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <ul className="list-disc pl-4 space-y-1">
                          {m.memberships.slice(0, 3).map((mem, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-semibold">{mem.season}</span> - {mem.membershipType} <span className="text-gray-400">({mem.status})</span>
                            </li>
                          ))}
                          {m.memberships.length > 3 && (
                            <li className="text-xs text-gray-400 italic">+{m.memberships.length - 3} more...</li>
                          )}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-indigo-600 font-semibold">
                          {new Set(m.memberships.map((x: any) => x.season)).size} Year(s)
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {!(searchQuery && filteredLeads.length === 0) && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-400 mt-8">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-400">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Prospects (Leads)</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {filteredLeads.length} Pending
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No prospects found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-400">
                  <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-400">
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
                            className="text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-md text-sm px-4 py-2 shadow-sm transition-colors mr-2"
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
