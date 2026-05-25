'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type MembershipPlan = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  isArchived: boolean;
};

export default function AdminSettingsPage() {
  const [cutoffMinutes, setCutoffMinutes] = useState(90);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(2);
  const [maxDaysInAdvance, setMaxDaysInAdvance] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  // For adding a new plan
  const [newPlan, setNewPlan] = useState({ name: '', description: '', cost: 0 });
  const [savingPlan, setSavingPlan] = useState(false);

  // For editing an existing plan
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanForm, setEditPlanForm] = useState<Partial<MembershipPlan>>({});

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setCutoffMinutes(data.settings.cancellationCutoffMinutes);
          setMaxHoursPerDay(data.settings.maxHoursPerDay ?? 2);
          setMaxDaysInAdvance(data.settings.maxDaysInAdvance ?? 3);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    fetch('/api/admin/plans')
      .then(res => res.json())
      .then(data => {
        if (data.plans) setPlans(data.plans);
        setPlansLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPlansLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cancellationCutoffMinutes: cutoffMinutes,
          maxHoursPerDay: maxHoursPerDay,
          maxDaysInAdvance: maxDaysInAdvance
        })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      setMessage('An error occurred while saving.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveNewPlan = async () => {
    if (!newPlan.name || newPlan.cost < 0) return alert('Name and a valid cost are required');
    setSavingPlan(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan)
      });
      if (res.ok) {
        const data = await res.json();
        setPlans([...plans, data.plan]);
        setNewPlan({ name: '', description: '', cost: 0 });
      } else {
        alert('Failed to save new plan. Name must be unique.');
      }
    } catch (err) {
      alert('Error saving plan');
    }
    setSavingPlan(false);
  };

  const handleStartEditPlan = (plan: MembershipPlan) => {
    setEditingPlanId(plan.id);
    setEditPlanForm(plan);
  };

  const handleSaveEditPlan = async () => {
    if (!editingPlanId || !editPlanForm.name) return;
    try {
      const res = await fetch(`/api/admin/plans/${editingPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlanForm)
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(plans.map(p => p.id === editingPlanId ? data.plan : p));
        setEditingPlanId(null);
      } else {
        alert('Failed to update plan');
      }
    } catch (err) {
      alert('Error updating plan');
    }
  };

  const handleToggleArchivePlan = async (plan: MembershipPlan) => {
    if (!confirm(`Are you sure you want to ${plan.isArchived ? 'unarchive' : 'archive'} the ${plan.name} plan?`)) return;
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !plan.isArchived })
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(plans.map(p => p.id === plan.id ? data.plan : p));
      } else {
        alert('Failed to archive/unarchive plan');
      }
    } catch (err) {
      alert('Error updating plan');
    }
  };

  if (loading || plansLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
        <Link 
          href="/admin" 
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <div className="space-y-6">
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Court Booking Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Cancellation Cutoff (Minutes)</label>
              <p className="text-sm text-gray-500 mb-2">
                Members cannot cancel a booking if the start time is less than this many minutes away.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  value={cutoffMinutes}
                  onChange={(e) => setCutoffMinutes(parseInt(e.target.value) || 0)}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                />
                <span className="text-gray-600">minutes</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Hours Per Day</label>
              <p className="text-sm text-gray-500 mb-2">
                The maximum number of hours a member can book courts per day.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={maxHoursPerDay}
                  onChange={(e) => setMaxHoursPerDay(parseInt(e.target.value) || 1)}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                />
                <span className="text-gray-600">hours</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Days in Advance</label>
              <p className="text-sm text-gray-500 mb-2">
                How many days into the future a member is allowed to book a court.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={maxDaysInAdvance}
                  onChange={(e) => setMaxDaysInAdvance(parseInt(e.target.value) || 1)}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                />
                <span className="text-gray-600">days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && <span className={message.includes('success') ? 'text-green-600 text-sm font-medium' : 'text-red-600 text-sm font-medium'}>{message}</span>}
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Membership Plans</h3>
          <p className="text-sm text-gray-500 mb-6">Manage the membership types and prices available for registration. Archived plans cannot be selected by new members.</p>
          
          <div className="space-y-4 mb-8">
            {plans.map(plan => (
              <div key={plan.id} className={`p-4 border rounded-md shadow-sm ${plan.isArchived ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}>
                {editingPlanId === plan.id ? (
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-3">
                      <input 
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1"
                        value={editPlanForm.name || ''}
                        onChange={e => setEditPlanForm({...editPlanForm, name: e.target.value})}
                        placeholder="Plan Name"
                      />
                      <input 
                        type="number"
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
                        value={editPlanForm.cost || 0}
                        onChange={e => setEditPlanForm({...editPlanForm, cost: parseFloat(e.target.value) || 0})}
                        placeholder="Cost ($)"
                      />
                    </div>
                    <input 
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full"
                      value={editPlanForm.description || ''}
                      onChange={e => setEditPlanForm({...editPlanForm, description: e.target.value})}
                      placeholder="Description (Optional)"
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                      <button onClick={() => setEditingPlanId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300">Cancel</button>
                      <button onClick={handleSaveEditPlan} className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${plan.isArchived ? 'text-gray-500' : 'text-gray-900'}`}>{plan.name}</h4>
                        <span className="text-sm font-medium text-green-600">${plan.cost}</span>
                        {plan.isArchived && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">Archived</span>}
                      </div>
                      <p className="text-sm text-gray-500">{plan.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleStartEditPlan(plan)}
                        className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleArchivePlan(plan)}
                        className={`text-sm px-2 py-1 ${plan.isArchived ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                      >
                        {plan.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {plans.length === 0 && <p className="text-sm text-gray-500 italic">No membership plans found.</p>}
          </div>

          <div className="bg-gray-50 p-4 border border-gray-200 rounded-md shadow-sm">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Membership Plan</h4>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <input 
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1"
                  value={newPlan.name}
                  onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                  placeholder="Plan Name (e.g. Young Adult)"
                />
                <input 
                  type="number"
                  min="0"
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
                  value={newPlan.cost}
                  onChange={e => setNewPlan({...newPlan, cost: parseFloat(e.target.value) || 0})}
                  placeholder="Cost ($)"
                />
              </div>
              <input 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full"
                value={newPlan.description}
                onChange={e => setNewPlan({...newPlan, description: e.target.value})}
                placeholder="Description (Optional)"
              />
              <div className="flex justify-end pt-1">
                <button 
                  onClick={handleSaveNewPlan}
                  disabled={savingPlan || !newPlan.name}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPlan ? 'Adding...' : 'Add Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
