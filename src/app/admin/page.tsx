'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { calculateHouseholdTotal as calcTotal } from '@/lib/pricing';
import { isValidPostalCode, isValidPhoneNumber, formatPhoneNumber, formatPostalCode } from '@/lib/validation';

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
    id: string;
    firstName: string;
    lastName: string;
    memberNumber?: string;
    tagNumber?: string;
    email: string;
    phoneNumber?: string;
    alternatePhoneNumber?: string;
    notes?: string;
    role?: string;
    gender?: string;
    dateOfBirth?: string | Date;
    wantsFreeLessons?: boolean;
    streetAddress?: string;
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

type CouponCode = {
  id: string;
  code: string;
  discountType: string;
  discountAmount: number;
  maxUses: number | null;
  currentUses: number;
};

export default function AdminDashboard() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [archived, setArchived] = useState<any[]>([]);
  const [pastMembers, setPastMembers] = useState<PastMember[]>([]);
  const [activeSeason, setActiveSeason] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<CouponCode[]>([]);
  const [pendingWelcomeCount, setPendingWelcomeCount] = useState(0);
  const [enableCsvImport, setEnableCsvImport] = useState(true);
  const [enableWelcomeEmails, setEnableWelcomeEmails] = useState(true);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number, skipped: number, skippedRecords: { email: string, name: string, reason: string }[] } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMarkAsPaid, setImportMarkAsPaid] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [activeEmailMenu, setActiveEmailMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    amountPaid: 0,
    paymentNotes: '',
    coveredMembershipIds: [] as string[],
    couponCode: '',
    couponCodeId: null as string | null,
    discountAmount: 0,
    totalMembershipCost: 0
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    notes: '',
    role: '',
    gender: '',
    dateOfBirth: '',
    wantsFreeLessons: false,
    membershipType: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    tagNumber: '',
    amountPaid: 0,
    paymentNotes: '',
    paymentRecordedAt: '',
  });
  const [editErrors, setEditErrors] = useState({ phoneNumber: '', postalCode: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Active' | 'Archived' | 'Past Members'>('All');
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [lessonsFilter, setLessonsFilter] = useState(false);
  const [staffFilter, setStaffFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'email' | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

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
      streetAddress: undefined,
      city: undefined,
      postalCode: undefined,
      householdId: undefined,
    }
  }) as Membership) : memberships).filter(m => {
    if (activeTab !== 'All' && activeTab !== 'Archived' && activeTab !== 'Past Members' && m.status !== activeTab) return false;
    if (genderFilter && m.user.gender !== genderFilter && (m as any).gender !== genderFilter) return false;
    if (lessonsFilter && !m.user.wantsFreeLessons && !(m as any).wantsFreeLessons) return false;
    if (staffFilter && m.user?.role !== 'ADMIN' && m.user?.role !== 'SUPER_ADMIN' && m.user?.role !== 'PRO') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fn = m.user.firstName.toLowerCase();
      const ln = m.user.lastName.toLowerCase();
      const em = m.user.email.toLowerCase();
      if (!fn.includes(q) && !ln.includes(q) && !em.includes(q)) return false;
    }
    return true;
  });

  if (sortConfig.key) {
    filteredMemberships.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (sortConfig.key === 'name') {
        aVal = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.toLowerCase();
        bVal = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.toLowerCase();
      } else if (sortConfig.key === 'email') {
        aVal = (a.user?.email || '').toLowerCase();
        bVal = (b.user?.email || '').toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

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
    if (genderFilter && (m as any).gender !== genderFilter) return false;
    if (lessonsFilter && !(m as any).wantsFreeLessons) return false;
    if (staffFilter && (m as any).role !== 'ADMIN' && (m as any).role !== 'SUPER_ADMIN' && (m as any).role !== 'PRO') return false;
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
        fetch('/api/admin/past-memberships'),
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
      if (memData.enableCsvImport !== undefined) setEnableCsvImport(memData.enableCsvImport);
      if (memData.enableWelcomeEmails !== undefined) setEnableWelcomeEmails(memData.enableWelcomeEmails);
      if (memData.currentUserPermissions) setCurrentUserPermissions(memData.currentUserPermissions);
      if (memData.isSuperAdmin !== undefined) setIsSuperAdmin(memData.isSuperAdmin);
      if (archData.archived) setArchived(archData.archived);
      if (leadsData.leads) setLeads(leadsData.leads);
      if (plansData.plans) setPlans(plansData.plans);
      if (memData.activeCoupons) setActiveCoupons(memData.activeCoupons);
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

  const calculateHouseholdTotal = (selectedIds: string[]) => {
    const selectedMemberships = memberships.filter(m => selectedIds.includes(m.id));
    const prices: Record<string, number> = {};
    plans.forEach(p => { prices[p.name] = p.cost; });
    
    const { totalDue } = calcTotal(selectedMemberships, prices);
    return totalDue;
  };

  const handlePayClick = (m: Membership) => {
    setPayingId(m.id);
    
    const householdMembers = m.user.householdId 
      ? memberships.filter(x => x.user.householdId === m.user.householdId && x.status === 'Pending')
      : [m];
      
    const selectedIds = householdMembers.map(x => x.id);
    if (!selectedIds.includes(m.id)) selectedIds.push(m.id);

    const amount = calculateHouseholdTotal(selectedIds);

    setPayForm({
      amountPaid: amount,
      paymentNotes: '',
      coveredMembershipIds: selectedIds,
      couponCode: '',
      couponCodeId: null,
      discountAmount: 0,
      totalMembershipCost: amount
    });
  };

  const handleCancelPay = () => {
    setPayingId(null);
  };

  const handleSavePayment = async (membershipId: string) => {
    try {
      const payload = {
        membershipId: payingId,
        amountPaid: payForm.amountPaid,
        paymentNotes: payForm.paymentNotes,
        coveredMembershipIds: payForm.coveredMembershipIds,
        couponCodeId: payForm.couponCodeId,
        discountAmount: payForm.discountAmount,
        totalMembershipCost: payForm.totalMembershipCost
      };

      const res = await fetch('/api/admin/memberships/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      alternatePhoneNumber: m.user.alternatePhoneNumber || '',
      notes: m.user.notes || '',
      role: m.user.role || 'MEMBER',
      gender: m.user.gender || '',
      dateOfBirth: m.user.dateOfBirth ? new Date(m.user.dateOfBirth).toISOString().split('T')[0] : '',
      wantsFreeLessons: m.user.wantsFreeLessons || false,
      membershipType: m.membershipType,
      streetAddress: m.user.streetAddress || '',
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
        if (value) setEditForm(prev => ({ ...prev, postalCode: formatPostalCode(value) }));
      }
    } else if (placeholder === 'Phone Number') {
      if (value && !isValidPhoneNumber(value)) {
        setEditErrors(prev => ({ ...prev, phoneNumber: 'Invalid 10-digit format' }));
      } else {
        setEditErrors(prev => ({ ...prev, phoneNumber: '' }));
        if (value) setEditForm(prev => ({ ...prev, phoneNumber: formatPhoneNumber(value) }));
      }
    }
  };

  const TARGET_FIELDS = [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email Address', required: true },
    { key: 'phoneNumber', label: 'Phone Number' },
    { key: 'gender', label: 'Gender' },
    { key: 'streetAddress', label: 'Street Address' },
    { key: 'city', label: 'City' },
    { key: 'postalCode', label: 'Postal Code' },
    { key: 'tagNumber', label: 'Shoe Tag Number' },
    { key: 'wantsFreeLessons', label: 'Interested in Free Lessons (Yes/No)' },
    { key: 'membershipType', label: 'Membership Type (Plan)' },
    { key: 'status', label: 'Membership Status (Active/Pending)' },
    { key: 'amountPaid', label: 'Amount Paid' },
    { key: 'paymentNotes', label: 'Payment Notes' },
    { key: 'paymentRecordedAt', label: 'Payment Date (YYYY-MM-DD)' },
    { key: 'householdId', label: 'Household Group ID' },
  ];

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
        
        if (!results.data || results.data.length === 0) {
          alert('CSV file is empty or invalid.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        
        // Auto-map based on similar names
        const initialMapping: Record<string, string> = {};
        TARGET_FIELDS.forEach(field => {
          const matchedHeader = headers.find(h => 
            h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.label.toLowerCase().replace(/[^a-z0-9]/g, '') ||
            h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (matchedHeader) {
            initialMapping[field.key] = matchedHeader;
          }
        });
        
        // Custom fuzzy matching for common variants
        if (!initialMapping['firstName']) {
          const match = headers.find(h => h.toLowerCase().includes('first'));
          if (match) initialMapping['firstName'] = match;
        }
        if (!initialMapping['lastName']) {
          const match = headers.find(h => h.toLowerCase().includes('last'));
          if (match) initialMapping['lastName'] = match;
        }
        if (!initialMapping['phoneNumber']) {
          const match = headers.find(h => h.toLowerCase().includes('phone'));
          if (match) initialMapping['phoneNumber'] = match;
        }
        if (!initialMapping['email']) {
          const match = headers.find(h => h.toLowerCase().includes('email'));
          if (match) initialMapping['email'] = match;
        }
        
        setFieldMapping(initialMapping);
        setShowImportModal(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const executeImport = async () => {
    const missingRequired = TARGET_FIELDS.filter(f => f.required && !fieldMapping[f.key]);
    if (missingRequired.length > 0) {
      alert(`Please map the following required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setImporting(true);
    setShowImportModal(false);

    const standardizedData = csvData.map(row => {
      const standardObj: any = {};
      TARGET_FIELDS.forEach(field => {
        const csvHeader = fieldMapping[field.key];
        if (csvHeader && row[csvHeader] !== undefined) {
          standardObj[field.key] = row[csvHeader];
        }
      });
      if (importMarkAsPaid) {
        standardObj.status = 'Active';
        if (!standardObj.paymentNotes) {
          standardObj.paymentNotes = 'Marked as paid during import';
        }
      }
      return standardObj;
    });

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardizedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setImportResult({ imported: data.importedCount, skipped: data.skippedCount, skippedRecords: data.skippedRecords || [] });
      fetchData();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
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

  const handleResendEmail = async (id: string, type: 'welcome' | 'import-welcome' | 'renewal' | 'interest' | 'pending') => {
    try {
      setActiveEmailMenu(null);
      const payload = type === 'interest' ? { leadId: id, type } : { userId: id, type };
      const res = await fetch('/api/admin/emails/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Successfully sent ${type} email!`);
    } catch (err: any) {
      alert(`Failed to send ${type} email: ` + err.message);
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
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{process.env.NEXT_PUBLIC_CLUB_NAME}<br /> {activeSeason && `${activeSeason}`}<br /></h2>
              
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
            {(isSuperAdmin || currentUserPermissions.includes('MANAGE_EVENTS')) && (
              <Link
                href="/admin/events"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Social Events
              </Link>
            )}
            {(isSuperAdmin || currentUserPermissions.includes('VIEW_REPORTS')) && (
              <Link
                href="/admin/reports"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
            )}
            {(isSuperAdmin || currentUserPermissions.includes('MANAGE_SETTINGS')) && (
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
            )}
            <Link
              href="/admin/feedback"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
              Feedback
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/staff"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Staff / Admins
              </Link>
            )}

            {(isSuperAdmin || currentUserPermissions.includes('EDIT_MEMBERS')) && enableCsvImport && (
              <>
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
              </>
            )}
            {enableWelcomeEmails && pendingWelcomeCount > 0 && (
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

        {importResult && (
          <div className="mb-8 p-4 bg-blue-50 text-blue-900 rounded-md border border-blue-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">Import Complete</h3>
              <button onClick={() => setImportResult(null)} className="text-blue-500 hover:text-blue-700 text-2xl leading-none">&times;</button>
            </div>
            <p className="mb-2">Successfully imported <strong>{importResult.imported}</strong> members.</p>
            {importResult.skipped > 0 && (
              <>
                <p className="mb-2 text-orange-800">Skipped <strong>{importResult.skipped}</strong> records that were duplicates or invalid.</p>
                {importResult.skippedRecords.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-y-auto bg-white rounded border border-blue-100 p-2">
                    <table className="min-w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 border-b border-gray-200">Name</th>
                          <th className="px-3 py-2 border-b border-gray-200">Email</th>
                          <th className="px-3 py-2 border-b border-gray-200">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.skippedRecords.map((rec, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="px-3 py-2">{rec.name}</td>
                            <td className="px-3 py-2">{rec.email}</td>
                            <td className="px-3 py-2 text-orange-600">{rec.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div 
            onClick={() => setActiveTab('Active')}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 cursor-pointer hover:bg-green-50 hover:border-green-400 transition-colors"
          >
            <p className="text-sm text-black-500 font-bold">Total Active Members</p>
            <p className="text-2xl font-bold text-green-600">{activeMembershipsCount}</p>
          </div>
          <div 
            onClick={() => setActiveTab('Pending')}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 cursor-pointer hover:bg-yellow-50 hover:border-yellow-400 transition-colors"
          >
            <p className="text-sm text-black-500 font-semibold">Pending Payments</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingMembershipsCount}</p>
          </div>
          <div 
            onClick={() => {
              const el = document.getElementById('prospects-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
          >
            <p className="text-sm text-black-300 font-semibold">Prospects</p>
            <p className="text-2xl font-bold text-blue-600">{prospectsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 relative group">
            <div className="flex justify-between items-center">
              <p className="text-sm text-black-500 font-bold">Gender Split</p>
              {genderFilter && (
                <button 
                  onClick={() => setGenderFilter(null)}
                  className="text-xs text-gray-400 hover:text-gray-700 bg-gray-100 px-2 rounded-full"
                  title="Clear Filter"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xl font-bold text-gray-700 mt-1 flex gap-2">
              <span 
                onClick={() => setGenderFilter(genderFilter === 'Female' ? null : 'Female')}
                className={`cursor-pointer transition-colors px-2 py-0.5 rounded ${genderFilter === 'Female' ? 'bg-pink-100 text-pink-700' : 'text-pink-600 hover:bg-pink-50'}`}
                title="Filter by Female"
              >
                {femaleCount}F
              </span>
              <span className="text-gray-300">/</span>
              <span 
                onClick={() => setGenderFilter(genderFilter === 'Male' ? null : 'Male')}
                className={`cursor-pointer transition-colors px-2 py-0.5 rounded ${genderFilter === 'Male' ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-50'}`}
                title="Filter by Male"
              >
                {maleCount}M
              </span>
            </p>
          </div>
          <div 
            onClick={() => setActiveTab('All')}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 cursor-pointer hover:bg-primary-50 hover:border-primary-400 transition-colors"
          >
            <p className="text-sm text-black-500 font-bold">Total Memberships</p>
            <p className="text-2xl font-bold text-primary-600">{totalMemberships}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-black-500 font-bold">Member Types</p>
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
          <nav className="flex flex-wrap gap-x-4 gap-y-2 border-b border-gray-400 w-full lg:w-auto">
            {['All', 'Pending', 'Active', 'Archived', 'Past Members'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 lg:py-4 px-1 border-b-2 font-medium text-sm`}
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
            <button
              onClick={() => setStaffFilter(!staffFilter)}
              className={`px-3 py-2 text-sm font-medium rounded-md border ${staffFilter ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title="Filter by Staff (Admins, Club Pros)"
            >
              🛡️ Staff
            </button>
            <button
              onClick={() => setLessonsFilter(!lessonsFilter)}
              className={`px-3 py-2 text-sm font-medium rounded-md border ${lessonsFilter ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title="Filter by members wanting free lessons"
            >
              🎾 Lessons
            </button>
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
              <>
              <div className="hidden md:block w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => setSortConfig({ key: 'name', direction: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      title="Sort by Member Name"
                    >
                      Member {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => setSortConfig({ key: 'email', direction: sortConfig.key === 'email' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      title="Sort by Email"
                    >
                      Email {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
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
                            <div className="mb-3 text-sm font-medium text-green-900 bg-green-100 p-2 rounded inline-block">
                              Applying payment for: {m.user.firstName} {m.user.lastName} ({m.user.email})
                            </div>
                            <div className="mb-4">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Apply Discount Code (Optional)</label>
                              <div className="flex gap-2">
                                <select
                                  className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 focus:ring-green-500 focus:border-green-500"
                                  value={payForm.couponCode}
                                  onChange={e => setPayForm({ ...payForm, couponCode: e.target.value })}
                                  disabled={!!payForm.couponCodeId}
                                >
                                  <option value="">Select a Coupon Code</option>
                                  {activeCoupons.map(c => {
                                    const disabled = c.maxUses !== null && c.currentUses >= c.maxUses;
                                    return (
                                      <option key={c.id} value={c.code} disabled={disabled}>
                                        {c.code} ({c.discountType === 'FIXED' ? '$' : ''}{c.discountAmount}{c.discountType === 'PERCENT' ? '%' : ''} off) {disabled ? '(Max Uses Reached)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                {!payForm.couponCodeId ? (
                                  <button 
                                    type="button"
                                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm font-medium border border-gray-300 hover:bg-gray-200"
                                    onClick={async () => {
                                      if (!payForm.couponCode) return;
                                      try {
                                        const res = await fetch(`/api/coupons/validate?code=${payForm.couponCode}&type=MEMBERSHIP`);
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error);
                                        
                                        const c = data.coupon;
                                        let discount = 0;
                                        if (c.discountType === 'FIXED') {
                                          discount = c.discountAmount;
                                        } else {
                                          discount = payForm.totalMembershipCost * (c.discountAmount / 100);
                                        }
                                        
                                        if (discount > payForm.totalMembershipCost) discount = payForm.totalMembershipCost;
                                        
                                        setPayForm({
                                          ...payForm,
                                          couponCodeId: c.id,
                                          discountAmount: discount,
                                          amountPaid: payForm.totalMembershipCost - discount
                                        });
                                      } catch(e: any) {
                                        alert(e.message);
                                      }
                                    }}
                                  >
                                    Apply
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    className="text-red-600 text-sm font-medium px-2 hover:underline"
                                    onClick={() => {
                                      setPayForm({
                                        ...payForm,
                                        couponCode: '',
                                        couponCodeId: null,
                                        discountAmount: 0,
                                        amountPaid: payForm.totalMembershipCost
                                      });
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              {payForm.couponCodeId && (
                                <div className="text-xs text-green-700 mt-1 font-medium">
                                  Discount applied: -${payForm.discountAmount.toFixed(2)}
                                </div>
                              )}
                            </div>
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
                            {m.user.householdId && memberships.filter(x => x.user.householdId === m.user.householdId && x.status === 'Pending').length > 1 && (
                              <div className="mt-4 bg-white p-3 border border-green-200 rounded text-sm max-w-lg">
                                <div className="font-semibold text-green-900 mb-2">Household Members Covered</div>
                                {memberships.filter(x => x.user.householdId === m.user.householdId && x.status === 'Pending').map(hm => (
                                  <label key={hm.id} className="flex items-center gap-2 mb-1 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="rounded text-green-600 focus:ring-green-500 h-4 w-4"
                                      checked={payForm.coveredMembershipIds.includes(hm.id)}
                                      disabled={hm.id === m.id}
                                      onChange={(e) => {
                                        const newIds = e.target.checked 
                                          ? [...payForm.coveredMembershipIds, hm.id]
                                          : payForm.coveredMembershipIds.filter(id => id !== hm.id);
                                        
                                        setPayForm({
                                          ...payForm,
                                          coveredMembershipIds: newIds,
                                          amountPaid: calculateHouseholdTotal(newIds)
                                        });
                                      }}
                                    />
                                    <span className="text-gray-800">{hm.user.firstName} {hm.user.lastName} ({hm.membershipType})</span>
                                  </label>
                                ))}
                                {payForm.amountPaid !== calculateHouseholdTotal(payForm.coveredMembershipIds) && (
                                  <div className="text-red-600 font-medium mt-2">
                                    Warning: Amount entered does not match the calculated amount due (${calculateHouseholdTotal(payForm.coveredMembershipIds)}).
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                            <button
                              onClick={handleCancelPay}
                              className="text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-md text-xs px-4 py-2 transition-colors mr-2"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSavePayment(m.id)}
                              className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-md text-xs px-4 py-2 transition-colors"
                            >
                              Confirm Payment
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    if (isEditing) {
                      return (
                        <tr key={m.id} className="bg-blue-50">
                          <td className="px-6 py-4" colSpan={3}>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                                <input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                                <input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                <input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                                <input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                                <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                                  <option value="">Unknown</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tag Number</label>
                                <input type="text" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.tagNumber} onChange={e => setEditForm({...editForm, tagNumber: e.target.value})} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Membership Type</label>
                                {m.membershipType === 'Family' ? (
                                  <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-400" title="Family memberships cannot be changed individually">Family (Locked)</div>
                                ) : (
                                  <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.membershipType} onChange={e => setEditForm({ ...editForm, membershipType: e.target.value })}>
                                    <option value="Adult">Adult</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Senior">Senior</option>
                                  </select>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">System Role</label>
                                <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                  <option value="MEMBER">Member</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid ($)</label>
                                <input type="number" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={editForm.amountPaid} onChange={e => setEditForm({...editForm, amountPaid: parseFloat(e.target.value) || 0})} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Free Lessons</label>
                                <div className="flex items-center h-[30px]">
                                  <input type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" checked={editForm.wantsFreeLessons} onChange={e => setEditForm({ ...editForm, wantsFreeLessons: e.target.checked })} />
                                  <span className="ml-2 text-sm text-gray-700">Interested</span>
                                </div>
                              </div>
                              <div className="col-span-1 sm:col-span-2 md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes</label>
                                <textarea className="border border-gray-300 rounded px-2 py-1 text-sm w-full" rows={1} value={editForm.paymentNotes} onChange={e => setEditForm({ ...editForm, paymentNotes: e.target.value })} placeholder="E.g., E-transfer confirmation #"></textarea>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                            <button onClick={handleCancelEdit} className="text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-md text-xs px-4 py-2 transition-colors mr-2">Cancel</button>
                            <button onClick={() => handleSaveEdit(m.id)} className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-md text-xs px-4 py-2 transition-colors mr-2">Save</button>
                            {activeTab !== 'Archived' && (
                              <button onClick={() => { handleDeleteMembership(m.id); setEditingId(null); }} className="text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 font-medium rounded-md text-xs px-4 py-2 transition-colors mt-2 block w-full text-center">Delete</button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                    const isExpanded = expandedId === m.id;
                    return (
                      <React.Fragment key={m.id}>
                        <tr 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {m.user.firstName} {m.user.lastName}
                            {(m.user.role === 'ADMIN' || m.user.role === 'SUPER_ADMIN') && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200" title="Administrator">Admin</span>
                            )}
                            {m.user.role === 'PRO' && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200" title="Club Pro">Club Pro</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {m.user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="font-medium text-gray-700 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">{m.membershipType}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {m.user.gender || '-'}
                            {m.status !== 'Active' && activeTab !== 'Archived' && (isSuperAdmin || currentUserPermissions.includes('EDIT_MEMBERS')) && (
                              <button onClick={(e) => { e.stopPropagation(); handlePayClick(m); }} className="float-right text-white bg-green-600 hover:bg-green-700 font-medium rounded text-[10px] px-2 py-0.5 transition-colors shadow-sm">Mark as Paid</button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 border-b border-gray-200 shadow-inner">
                            <td colSpan={4} className="px-6 py-4">
                              <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                                  {m.user.memberNumber && <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded border border-gray-300">ID: {m.user.memberNumber}</span>}
                                  {m.user.tagNumber && <span className="bg-green-50 text-green-700 text-xs font-mono px-2 py-0.5 rounded border border-green-200">Tag: {m.user.tagNumber}</span>}
                                  {m.user.householdId && memberships.filter(x => x.user.householdId === m.user.householdId).length > 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedHouseholdId(m.user.householdId!); }} className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-mono px-2 py-0.5 rounded border border-purple-200 cursor-pointer transition-colors">Household {memberships.find(x => x.user.householdId === m.user.householdId)?.user.lastName}</button>
                                  )}
                                  {m.user.wantsFreeLessons && <span className="bg-orange-50 text-orange-700 text-xs font-mono px-2 py-0.5 rounded border border-orange-200">🎾 Free Lessons</span>}
                                  
                                  {m.user.phoneNumber && <span><span className="font-medium text-gray-400">Phone:</span> {formatPhoneNumber(m.user.phoneNumber)}</span>}
                                  <span><span className="font-medium text-gray-400">Joined:</span> {new Date(m.createdAt).toLocaleDateString()}</span>
                                  {m.archivedAt && <span className="text-red-500 font-medium">Deleted on: {new Date(m.archivedAt).toLocaleDateString()}</span>}
                                </div>
                                <div className="flex flex-wrap gap-2 items-start justify-end shrink-0">
                                  {activeTab !== 'Archived' && (
                                    <div className="inline-block relative text-left">
                                      <button onClick={(e) => { e.stopPropagation(); setActiveEmailMenu(activeEmailMenu === m.id ? null : m.id); }} className="inline-flex items-center justify-center text-white bg-gray-800 hover:bg-gray-900 shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-colors">
                                        Email ▾
                                      </button>
                                      {activeEmailMenu === m.id && (
                                        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                                          <button onClick={(e) => { e.stopPropagation(); handleResendEmail(m.user.id, 'welcome'); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Resend Welcome Email</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleResendEmail(m.user.id, 'import-welcome'); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Resend Import Welcome Email</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleResendEmail(m.user.id, 'pending'); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Resend Registration Pending</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleResendEmail(m.user.id, 'renewal'); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Resend Renewal Link</button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {activeTab !== 'Archived' && (isSuperAdmin || currentUserPermissions.includes('EDIT_MEMBERS')) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(m); }} className="text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm font-medium rounded-md text-sm px-4 py-2 transition-colors">Edit</button>
                                  )}
                                  {activeTab === 'Archived' && <span className="text-gray-400 text-sm italic py-2">Archived</span>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="block md:hidden space-y-4">
              {filteredMemberships.map((m) => {
                const isEditing = editingId === m.id;
                const isPaying = payingId === m.id;

                if (isPaying) {
                  return (
                    <div key={m.id} className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                      <div className="mb-4 pb-3 border-b border-green-200">
                        <div className="font-semibold text-green-900 text-sm">Applying payment for:</div>
                        <div className="text-sm text-green-800">{m.user.firstName} {m.user.lastName}</div>
                        <div className="text-xs text-green-700">{m.user.email}</div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Apply Discount Code (Optional)</label>
                        <div className="flex gap-2">
                          <select
                            className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 focus:ring-green-500 focus:border-green-500"
                            value={payForm.couponCode}
                            onChange={e => setPayForm({ ...payForm, couponCode: e.target.value })}
                            disabled={!!payForm.couponCodeId}
                          >
                            <option value="">Select a Coupon Code</option>
                            {activeCoupons.map(c => {
                              const disabled = c.maxUses !== null && c.currentUses >= c.maxUses;
                              return (
                                <option key={c.id} value={c.code} disabled={disabled}>
                                  {c.code} ({c.discountType === 'FIXED' ? '$' : ''}{c.discountAmount}{c.discountType === 'PERCENT' ? '%' : ''} off) {disabled ? '(Max Uses Reached)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          {!payForm.couponCodeId ? (
                            <button 
                              type="button"
                              className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-200"
                              onClick={async () => {
                                if (!payForm.couponCode) return;
                                try {
                                  const res = await fetch(`/api/coupons/validate?code=${payForm.couponCode}&type=MEMBERSHIP`);
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error);
                                  
                                  const c = data.coupon;
                                  let discount = 0;
                                  if (c.discountType === 'FIXED') {
                                    discount = c.discountAmount;
                                  } else {
                                    discount = payForm.totalMembershipCost * (c.discountAmount / 100);
                                  }
                                  
                                  if (discount > payForm.totalMembershipCost) discount = payForm.totalMembershipCost;
                                  
                                  setPayForm({
                                    ...payForm,
                                    couponCodeId: c.id,
                                    discountAmount: discount,
                                    amountPaid: payForm.totalMembershipCost - discount
                                  });
                                } catch(e: any) {
                                  alert(e.message);
                                }
                              }}
                            >
                              Apply
                            </button>
                          ) : (
                            <button 
                              type="button"
                              className="text-red-600 text-sm font-medium px-2 hover:underline"
                              onClick={() => {
                                setPayForm({
                                  ...payForm,
                                  couponCode: '',
                                  couponCodeId: null,
                                  discountAmount: 0,
                                  amountPaid: payForm.totalMembershipCost
                                });
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {payForm.couponCodeId && (
                          <div className="text-xs text-green-700 mt-1 font-medium">
                            Discount applied: -${payForm.discountAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid ($)</label>
                        <input 
                          type="number"
                          className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:ring-green-500 focus:border-green-500"
                          value={payForm.amountPaid}
                          onChange={e => setPayForm({ ...payForm, amountPaid: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Notes / E-transfer details</label>
                        <input 
                          type="text"
                          placeholder="e.g. e-transfer confirmation #123456"
                          className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:ring-green-500 focus:border-green-500"
                          value={payForm.paymentNotes}
                          onChange={e => setPayForm({ ...payForm, paymentNotes: e.target.value })}
                        />
                      </div>
                      {m.user.householdId && memberships.filter(x => x.user.householdId === m.user.householdId && x.status === 'Pending').length > 1 && (
                        <div className="mb-4 bg-white p-3 border border-green-200 rounded text-sm">
                          <div className="font-semibold text-green-900 mb-2">Household Members Covered</div>
                          {memberships.filter(x => x.user.householdId === m.user.householdId && x.status === 'Pending').map(hm => (
                            <label key={hm.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="rounded text-green-600 focus:ring-green-500 h-4 w-4"
                                checked={payForm.coveredMembershipIds.includes(hm.id)}
                                disabled={hm.id === m.id}
                                onChange={(e) => {
                                  const newIds = e.target.checked 
                                    ? [...payForm.coveredMembershipIds, hm.id]
                                    : payForm.coveredMembershipIds.filter(id => id !== hm.id);
                                  
                                  setPayForm({
                                    ...payForm,
                                    coveredMembershipIds: newIds,
                                    amountPaid: calculateHouseholdTotal(newIds)
                                  });
                                }}
                              />
                              <span className="text-gray-800">{hm.user.firstName} {hm.user.lastName} <span className="text-gray-500">({hm.membershipType})</span></span>
                            </label>
                          ))}
                          {payForm.amountPaid !== calculateHouseholdTotal(payForm.coveredMembershipIds) && (
                            <div className="text-red-600 font-medium mt-2 text-xs">
                              Warning: Amount entered does not match the calculated amount due (${calculateHouseholdTotal(payForm.coveredMembershipIds)}).
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleSavePayment(m.id)}
                          className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full"
                        >
                          Confirm Payment
                        </button>
                        <button
                          onClick={handleCancelPay}
                          className="text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isEditing) {
                  return (
                    <div key={m.id} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
                      <div className="flex flex-col gap-3 mb-4">
                        <input className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First Name" />
                        <input className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last Name" />
                        
                        <label className="text-xs font-semibold text-gray-700 mt-2">Gender</label>
                        <select className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                          <option value="">Unknown</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        
                        <input type="text" className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.tagNumber} onChange={e => setEditForm({...editForm, tagNumber: e.target.value})} placeholder="Tag Number" />
                        
                        <input className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" />
                        <input className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} placeholder="Phone Number" />
                        <input className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.alternatePhoneNumber} onChange={e => setEditForm({ ...editForm, alternatePhoneNumber: e.target.value })} placeholder="Alternate Phone Number" />
                        
                        <textarea className="border border-gray-300 rounded px-3 py-2 text-sm w-full col-span-1 sm:col-span-2" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Member Notes (Allergies, Medical, General Info)"></textarea>
                        
                        <label className="text-xs font-semibold text-gray-700 mt-2">Amount Paid ($)</label>
                        <input type="number" className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.amountPaid} onChange={e => setEditForm({...editForm, amountPaid: parseFloat(e.target.value) || 0})} />
                        
                        <label className="text-xs font-semibold text-gray-700 mt-2">Membership Type</label>
                        {m.membershipType === 'Family' ? (
                          <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded border border-gray-400 w-full" title="Family memberships cannot be changed individually">Family (Locked)</div>
                        ) : (
                          <select className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.membershipType} onChange={e => setEditForm({ ...editForm, membershipType: e.target.value })}>
                            <option value="Adult">Adult</option>
                            <option value="Junior">Junior</option>
                            <option value="Senior">Senior</option>
                          </select>
                        )}
                        <label className="text-xs font-semibold text-gray-700 mt-2">System Role</label>
                        <select className="border border-gray-300 rounded px-3 py-2 text-sm w-full" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        
                        <div className="flex items-center mt-3 mb-1">
                          <input type="checkbox" id="mobileFreeLessons" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" checked={editForm.wantsFreeLessons} onChange={e => setEditForm({ ...editForm, wantsFreeLessons: e.target.checked })} />
                          <label htmlFor="mobileFreeLessons" className="ml-2 block text-sm text-gray-900">Interested in Free Lessons</label>
                        </div>

                        <label className="text-xs font-semibold text-gray-700 mt-2">Payment Notes</label>
                        <textarea className="border border-gray-300 rounded px-3 py-2 text-sm w-full" rows={2} value={editForm.paymentNotes} onChange={e => setEditForm({ ...editForm, paymentNotes: e.target.value })} placeholder="E.g., E-transfer confirmation #"></textarea>
                      </div>
                      <div className="flex flex-col gap-2 border-t border-blue-200 pt-4">
                        <button onClick={() => handleSaveEdit(m.id)} className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full">Save Changes</button>
                        <button onClick={handleCancelEdit} className="text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full">Cancel</button>
                        <button onClick={() => { handleDeleteMembership(m.id); setEditingId(null); }} className="text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 font-medium rounded-md text-sm px-4 py-2 transition-colors w-full mt-4">Delete Membership</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-base font-semibold text-gray-900 flex items-center">
                          {m.user.firstName} {m.user.lastName}
                          {(m.user.role === 'ADMIN' || m.user.role === 'SUPER_ADMIN') && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200" title="Administrator">Admin</span>
                          )}
                          {m.user.role === 'PRO' && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200" title="Club Pro">Club Pro</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-700 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mr-2">{m.membershipType}</span>
                          {m.status !== 'Active' && activeTab !== 'Archived' && (isSuperAdmin || currentUserPermissions.includes('EDIT_MEMBERS')) && (
                            <button onClick={(e) => { e.stopPropagation(); handlePayClick(m); }} className="text-white bg-green-600 hover:bg-green-700 font-medium rounded text-[10px] px-2 py-0.5 transition-colors shadow-sm mr-2">Mark as Paid</button>
                          )}
                          {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {m.user.memberNumber && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded border border-gray-400">#{m.user.memberNumber}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.user.tagNumber && <span className="bg-green-50 text-green-700 text-[10px] font-mono px-2 py-0.5 rounded border border-green-200">Tag: {m.user.tagNumber}</span>}
                      {m.user.householdId && memberships.filter(x => x.user.householdId === m.user.householdId).length > 1 && <span className="bg-purple-50 text-purple-700 text-[10px] font-mono px-2 py-0.5 rounded border border-purple-200 cursor-pointer" onClick={() => setSelectedHouseholdId(m.user.householdId!)}>Household {memberships.find(x => x.user.householdId === m.user.householdId)?.user.lastName}</span>}
                      {m.user.wantsFreeLessons && <span className="bg-orange-50 text-orange-700 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-200">🎾 Lessons</span>}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
                      <div><span className="font-medium text-gray-400 w-16 inline-block">Email:</span> {m.user.email}</div>
                      {m.user.phoneNumber && <div><span className="font-medium text-gray-400 w-16 inline-block">Phone:</span> {formatPhoneNumber(m.user.phoneNumber)}</div>}
                      {m.user.gender && <div><span className="font-medium text-gray-400 w-16 inline-block">Gender:</span> {m.user.gender}</div>}
                    </div>

                    <div className="mt-auto border-t border-gray-100 pt-3 flex flex-col gap-2">
                      {activeTab !== 'Archived' && (
                        <div className="relative w-full">
                          <button onClick={() => setActiveEmailMenu(activeEmailMenu === m.id ? null : m.id)} className="w-full text-white bg-gray-800 hover:bg-gray-900 shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-colors">Email ▾</button>
                          {activeEmailMenu === m.id && (
                            <div className="absolute bottom-full mb-1 left-0 flex flex-col gap-1 w-full bg-white border border-gray-200 rounded-md p-1 shadow-lg z-50">
                              <button onClick={() => handleResendEmail(m.user.id, 'welcome')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">Resend Welcome</button>
                              <button onClick={() => handleResendEmail(m.user.id, 'renewal')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">Resend Renewal</button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {activeTab !== 'Archived' && (isSuperAdmin || currentUserPermissions.includes('EDIT_MEMBERS')) && <button onClick={() => handleEditClick(m)} className="flex-1 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm font-medium rounded-md text-sm px-4 py-2 transition-colors">Edit</button>}
                      </div>
                      
                      {activeTab === 'Archived' && <div className="text-center w-full text-gray-400 text-sm italic mt-2">Archived on {new Date(m.archivedAt!).toLocaleDateString()}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
              </>
            )}

            {activeTab === 'Past Members' && filteredPastMembers.length === 0 && (
              <div className="p-8 text-center text-gray-500 bg-gray-50">
                No past members found matching your criteria.
              </div>
            )}
            {activeTab === 'Past Members' && filteredPastMembers.length > 0 && (
              <>
              <div className="hidden md:block w-full overflow-x-auto">
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
                        {m.phoneNumber && <div className="text-gray-400 mt-1">{formatPhoneNumber(m.phoneNumber)}</div>}
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
              </div>
              {activeTab === 'Past Members' && filteredPastMembers.length > 0 && (
              <div className="block md:hidden space-y-4">
                {filteredPastMembers.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-base font-semibold text-gray-900">{m.firstName} {m.lastName}</div>
                        <div className="text-xs text-indigo-600 font-semibold mt-1">
                          Tenure: {new Set(m.memberships.map((x: any) => x.season)).size} Year(s)
                        </div>
                      </div>
                      {m.memberNumber && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded border border-gray-400">#{m.memberNumber}</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
                      <div><span className="font-medium text-gray-400 w-16 inline-block">Email:</span> {m.email}</div>
                      {m.phoneNumber && <div><span className="font-medium text-gray-400 w-16 inline-block">Phone:</span> {formatPhoneNumber(m.phoneNumber)}</div>}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Past Memberships</div>
                      <ul className="space-y-2">
                        {m.memberships.slice(0, 3).map((mem, i) => (
                          <li key={i} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded text-sm">
                            <span className="font-semibold text-gray-700">{mem.season}</span>
                            <span className="text-gray-600">{mem.membershipType} <span className="text-xs text-gray-400 ml-1">({mem.status})</span></span>
                          </li>
                        ))}
                        {m.memberships.length > 3 && (
                          <li className="text-xs text-center text-gray-400 italic pt-1">+{m.memberships.length - 3} more records...</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </>
            )}
          </div>
        </div>

        {!(searchQuery && filteredLeads.length === 0) && (
          <div id="prospects-table" className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-400 mt-8">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-400">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Prospects (Leads)</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {filteredLeads.length} Pending
              </span>
            </div>
            
            <div>
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No prospects found.</div>
              ) : (
                <>
                <div className="hidden md:block w-full overflow-x-auto">
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
                        {lead.phoneNumber && <div className="text-sm text-gray-500">{formatPhoneNumber(lead.phoneNumber)}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {lead.status !== 'Converted' && (
                          <Link
                            href={`/register?leadId=${lead.id}`}
                            className="text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-md text-sm px-3 py-1.5 shadow-sm transition-colors mr-2"
                          >
                            Register
                          </Link>
                        )}
                        <button
                          onClick={() => handleResendEmail(lead.id, 'interest')}
                          className="text-white bg-gray-600 hover:bg-gray-700 font-medium rounded-md text-sm px-3 py-1.5 shadow-sm transition-colors mr-2"
                        >
                          Resend Email
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-white bg-red-600 hover:bg-red-700 font-medium rounded-md text-sm px-3 py-1.5 shadow-sm transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              
              <div className="md:hidden flex flex-col gap-4 bg-gray-50 p-4 border-t border-gray-200">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-lg font-bold text-gray-900 leading-tight">{lead.firstName} {lead.lastName}</h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
                      <div><span className="font-medium text-gray-400 w-16 inline-block">Email:</span> {lead.email}</div>
                      {lead.phoneNumber && <div><span className="font-medium text-gray-400 w-16 inline-block">Phone:</span> {formatPhoneNumber(lead.phoneNumber)}</div>}
                    </div>
                    
                    <div className="mt-auto border-t border-gray-100 pt-3 flex flex-col sm:flex-row gap-2">
                      {lead.status !== 'Converted' && (
                        <Link
                          href={`/register?leadId=${lead.id}`}
                          className="flex-1 text-center text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-md text-sm px-3 py-1.5 transition-colors shadow-sm"
                        >
                          Register
                        </Link>
                      )}
                      <button
                        onClick={() => handleResendEmail(lead.id, 'interest')}
                        className="flex-1 text-white bg-gray-600 hover:bg-gray-700 font-medium rounded-md text-sm px-3 py-1.5 transition-colors shadow-sm"
                      >
                        Resend Email
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="flex-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 font-medium rounded-md text-sm px-3 py-1.5 transition-colors shadow-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Map CSV Columns</h3>
              <p className="text-sm text-gray-500 mt-1">We found {csvHeaders.length} columns in your CSV. Map them to the correct fields in our database.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="flex flex-col sm:flex-row mb-2 px-3">
                <div className="w-full sm:w-1/2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-0">
                  Database Field
                </div>
                <div className="w-full sm:w-1/2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  CSV File Column
                </div>
              </div>
              <div className="space-y-4">
                {TARGET_FIELDS.map(field => (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                    <div className="w-full sm:w-1/2 mb-2 sm:mb-0">
                      <span className="text-sm font-medium text-gray-900">{field.label}</span>
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <div className="w-full sm:w-1/2">
                      <select
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={fieldMapping[field.key] || ''}
                        onChange={(e) => setFieldMapping({...fieldMapping, [field.key]: e.target.value})}
                      >
                        <option value="">-- Ignore this field --</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-lg">
              <div className="flex items-center self-start sm:self-auto">
                <input
                  id="importMarkAsPaid"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={importMarkAsPaid}
                  onChange={(e) => setImportMarkAsPaid(e.target.checked)}
                />
                <label htmlFor="importMarkAsPaid" className="ml-2 block text-sm font-medium text-gray-900">
                  Mark all as Paid (Active)
                </label>
              </div>
              <div className="flex justify-end gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeImport}
                  className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Confirm & Import {csvData.length} Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedHouseholdId && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-gray-900">
                Household {memberships.find(x => x.user.householdId === selectedHouseholdId)?.user.lastName}
              </h3>
              <button
                onClick={() => setSelectedHouseholdId(null)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {memberships.filter(m => m.user.householdId === selectedHouseholdId).map(m => (
                  <div key={m.id} className="border border-gray-200 rounded-md p-4 bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{m.user.firstName} {m.user.lastName}</div>
                      <div className="text-xs text-gray-500">{m.user.email}</div>
                      {m.user.phoneNumber && <div className="text-xs text-gray-500">{formatPhoneNumber(m.user.phoneNumber)}</div>}
                    </div>
                    <div className="flex flex-col sm:items-end gap-1">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {m.membershipType}
                      </span>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-lg">
              <button
                onClick={() => setSelectedHouseholdId(null)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
