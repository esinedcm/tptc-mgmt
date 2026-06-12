'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  adminPermissions: string[];
};

type Membership = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

const PERMISSIONS = [
  { id: 'SUPER_ADMIN', label: 'Super Admin (Full Access)' },
  { id: 'VIEW_MEMBERS', label: 'View Members' },
  { id: 'EDIT_MEMBERS', label: 'Edit Members' },
  { id: 'VIEW_REPORTS', label: 'View Reports' },
  { id: 'MANAGE_EVENTS', label: 'Manage Events' },
  { id: 'MANAGE_SETTINGS', label: 'Manage Settings' },
  { id: 'MANAGE_COUPONS', label: 'Manage Coupons' }
];

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allMembers, setAllMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, memRes] = await Promise.all([
        fetch('/api/admin/staff'),
        fetch('/api/admin/memberships')
      ]);

      if (staffRes.status === 403) {
        setError('You do not have permission to view this page. Only Super Admins can manage staff.');
        setLoading(false);
        return;
      }

      const staffData = await staffRes.json();
      const memData = await memRes.json();

      if (staffData.staff) setStaff(staffData.staff);
      if (memData.memberships) {
        // deduplicate members
        const uniqueMembers = Array.from(new Map(memData.memberships.map((m: any) => [m.user.id, m])).values());
        setAllMembers(uniqueMembers as Membership[]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, permissions: selectedPermissions })
      });
      if (!res.ok) throw new Error('Failed to update staff member');
      
      setSelectedUserId('');
      setSelectedPermissions([]);
      setEditingStaffId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke admin access for this user?')) return;
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to demote staff member');
      
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (s: StaffMember) => {
    setEditingStaffId(s.id);
    setSelectedUserId(s.id);
    setSelectedPermissions(s.adminPermissions || []);
  };

  const cancelEdit = () => {
    setEditingStaffId(null);
    setSelectedUserId('');
    setSelectedPermissions([]);
  };

  if (loading) return <div className="p-8 text-center">Loading staff data...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const eligibleMembers = allMembers.filter(m => !staff.some(s => s.id === m.user.id));

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Staff / Admin Management</h2>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">{editingStaffId ? 'Edit Staff Member' : 'Promote Existing Member to Admin'}</h3>
          
          <div className="space-y-4 max-w-xl">
            {!editingStaffId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
                <select 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- Select a member --</option>
                  {eligibleMembers.map(m => (
                    <option key={m.user.id} value={m.user.id}>{m.user.firstName} {m.user.lastName} ({m.user.email})</option>
                  ))}
                </select>
              </div>
            )}
            
            {(selectedUserId || editingStaffId) && (
              <div className="space-y-2 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                {PERMISSIONS.map(p => (
                  <label key={p.id} className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      checked={p.id === 'VIEW_MEMBERS' ? true : selectedPermissions.includes(p.id)}
                      disabled={p.id === 'VIEW_MEMBERS'}
                      onChange={() => handleTogglePermission(p.id)}
                    />
                    <span className="text-sm text-gray-900">{p.label}</span>
                  </label>
                ))}
                
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={handleSave}
                    disabled={!selectedUserId}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {editingStaffId ? 'Save Changes' : 'Promote to Admin'}
                  </button>
                  {editingStaffId && (
                    <button 
                      onClick={cancelEdit}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</div>
                    <div className="text-sm text-gray-500">{s.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {s.adminPermissions?.length === 0 || s.adminPermissions?.includes('SUPER_ADMIN') ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Super Admin</span>
                      ) : (
                        s.adminPermissions?.map(p => {
                          const label = PERMISSIONS.find(x => x.id === p)?.label || p;
                          return <span key={p} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{label}</span>;
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => startEdit(s)} className="text-primary-600 hover:text-primary-900 mr-4">Edit</button>
                    <button onClick={() => handleDemote(s.id)} className="text-red-600 hover:text-red-900">Revoke</button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No staff members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
