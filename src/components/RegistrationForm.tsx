'use client';

import React, { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';

type MembershipPlan = {
  id: string;
  name: string;
  description: string;
  cost: number;
  isArchived: boolean;
};

export function RegistrationForm({ initialEditToken, initialLeadId }: { initialEditToken?: string; initialLeadId?: string }) {
  const [address, setAddress] = useState({
    streetNumber: '',
    streetName: '',
    city: '',
    postalCode: '',
  });

  const [members, setMembers] = useState([{
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    wantsFreeLessons: false,
    membershipType: '',
  }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [postalError, setPostalError] = useState('');
  const [memberErrors, setMemberErrors] = useState<Record<number, string>>({});
  
  const [success, setSuccess] = useState(false);
  const [editToken, setEditToken] = useState<string | undefined>(initialEditToken);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState('');
  const [loadingHousehold, setLoadingHousehold] = useState(!!initialEditToken || !!initialLeadId);
  
  const [plans, setPlans] = useState<MembershipPlan[]>([]);

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (res.ok) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      }
    };
    fetchPlans();
    
    if (initialEditToken) {
      fetch(`/api/registration/${initialEditToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.address) setAddress(data.address);
          if (data.members) {
            // Format dates for input type="date"
            const formattedMembers = data.members.map((m: any) => ({
              ...m,
              dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth).toISOString().split('T')[0] : '',
              wantsFreeLessons: !!m.wantsFreeLessons
            }));
            setMembers(formattedMembers);
          }
        })
        .finally(() => setLoadingHousehold(false));
    } else if (initialLeadId) {
      fetch(`/api/leads/${initialLeadId}`)
        .then(res => res.json())
        .then(data => {
          if (data.lead) {
            setMembers([{
              firstName: data.lead.firstName,
              lastName: data.lead.lastName,
              email: data.lead.email,
              password: '',
              phoneNumber: data.lead.phoneNumber || '',
              gender: data.lead.gender || '',
              dateOfBirth: '',
              wantsFreeLessons: false,
              membershipType: '',
            }]);
          }
        })
        .finally(() => setLoadingHousehold(false));
    }
  }, [initialEditToken, initialLeadId]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | boolean = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    }
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [name]: finalValue };
      return updated;
    });
  };

  const addMember = (e: React.MouseEvent) => {
    e.preventDefault();
    setMembers((prev) => [
      ...prev,
      { firstName: '', lastName: '', email: '', password: '', phoneNumber: '', gender: '', dateOfBirth: '', wantsFreeLessons: false, membershipType: '' }
    ]);
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    const newErrors = { ...memberErrors };
    delete newErrors[index];
    // We should ideally shift the keys, but this is a simple form.
    // For a robust solution, we can just clear all errors or re-validate.
    setMemberErrors({});
  };

  const handleAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.name === 'postalCode') {
      if (address.postalCode && !isValidPostalCode(address.postalCode)) {
        setPostalError('Invalid format (e.g. M1M 1M1)');
      } else {
        setPostalError('');
      }
    }
  };

  const handleMemberBlur = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.name === 'phoneNumber') {
      const value = members[index].phoneNumber;
      if (value && !isValidPhoneNumber(value)) {
        setMemberErrors(prev => ({ ...prev, [index]: 'Invalid 10-digit format' }));
      } else {
        setMemberErrors(prev => ({ ...prev, [index]: '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!isValidPostalCode(address.postalCode)) {
      setError('Invalid Postal Code format. Please use a valid Canadian format (e.g. M1M 1M1).');
      setLoading(false);
      return;
    }

    for (let i = 0; i < members.length; i++) {
      if (members[i].phoneNumber && !isValidPhoneNumber(members[i].phoneNumber)) {
        setError(`Invalid phone number format for Member ${i + 1}. Please use a standard 10-digit number.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, members, editToken, leadId: initialLeadId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      if (data.editToken) setEditToken(data.editToken);
      if (data.emailPreviewUrl) setEmailPreviewUrl(data.emailPreviewUrl);
      
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const manuallySelectedFamily = members.some((m) => m.membershipType === 'Family');
    const familyPlan = plans.find(p => p.name === 'Family');
    const familyCost = familyPlan ? familyPlan.cost : 200;
    
    // Create a dictionary of prices from the DB
    const prices: Record<string, number> = {};
    plans.forEach(p => { prices[p.name] = p.cost; });
    
    let totalDue = 0;
    let autoFamilyApplied = false;

    if (manuallySelectedFamily) {
      totalDue = familyCost; 
    } else {
      const numAdults = members.filter(m => m.membershipType === 'Adult').length;
      const numJuniors = members.filter(m => m.membershipType === 'Junior').length;
      const numSeniors = members.filter(m => m.membershipType === 'Senior').length;

      // Automatically apply Family plan if 2 Adults and at least 1 Junior
      if (numAdults >= 2 && numJuniors >= 1) {
        autoFamilyApplied = true;
        totalDue += familyCost; // Covers 2 Adults and up to 2 Juniors
        
        const extraAdults = Math.max(0, numAdults - 2);
        const extraJuniors = Math.max(0, numJuniors - 2);
        
        totalDue += extraAdults * (prices['Adult'] || 85);
        totalDue += extraJuniors * (prices['Junior'] || 50);
        totalDue += numSeniors * (prices['Senior'] || 70);
      } else {
        totalDue = members.reduce((sum, m) => sum + (prices[m.membershipType] || 0), 0);
      }
    }
    
    const showFamilyDiscount = manuallySelectedFamily || autoFamilyApplied;

    return (
      <div className="p-8 bg-green-50 border border-green-200 rounded-lg max-w-2xl mx-auto shadow-sm">
        <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Registration Successful!</h3>
        <p className="text-green-700 text-center mb-8 text-lg">
          Your household has been registered and is pending payment.
        </p>

        <div className="bg-white p-6 rounded-md shadow-sm mb-6 border border-green-100">
          <h4 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Registration Details</h4>
          
          <div className="mb-6">
            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Household Address</h5>
            <p className="text-gray-800 text-sm">
              {address.streetNumber} {address.streetName}<br />
              {address.city}, {address.postalCode}
            </p>
          </div>

          <div>
            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Registered Members</h5>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex justify-between items-start border border-gray-100 p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{member.firstName} {member.lastName}</span>
                      <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                        {member.membershipType}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {member.email}
                      </span>
                      {member.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {member.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-semibold mt-0.5 ${showFamilyDiscount && member.membershipType !== 'Family' ? 'text-gray-400 line-through text-sm' : 'text-gray-900'}`}>
                    ${prices[member.membershipType] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-green-100 p-6 rounded-md flex justify-between items-center">
          <div className="text-green-800 font-medium">
            {showFamilyDiscount && <div className="text-sm text-green-700 mb-1">Family Bundle Discount Applied</div>}
            Total Amount Due:
          </div>
          <div className="text-3xl font-bold text-green-900">${totalDue}</div>
        </div>

        {emailPreviewUrl && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-800 mb-2 font-medium">
              We just sent a confirmation email to {members[0].email} with a link to edit this form.
            </p>
            <a 
              href={emailPreviewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              (Dev Mode: View simulated email here)
            </a>
          </div>
        )}

        <p className="text-green-700 text-center mt-6 text-sm">
          Please contact the club administrator to complete your payment and activate your accounts.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setSuccess(false)}
            className="px-6 py-2 border border-green-600 text-green-700 font-medium rounded hover:bg-green-50 transition-colors"
          >
            Edit Registration
          </button>
          <button 
            onClick={() => {
              setAddress({ streetNumber: '', streetName: '', city: '', postalCode: '' });
              setMembers([{ firstName: '', lastName: '', email: '', password: '', phoneNumber: '', gender: '', dateOfBirth: '', wantsFreeLessons: false, membershipType: '' }]);
              setSuccess(false);
            }}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors"
          >
            Start New Registration
          </button>
        </div>
      </div>
    );
  }

  if (loadingHousehold) {
    return <div className="text-center py-12 text-gray-500 font-medium">Loading your registration...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {editToken ? 'Edit Club Registration' : 'Club Registration'}
      </h2>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Address Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Household Address</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="Street Number" name="streetNumber" value={address.streetNumber} onChange={handleAddressChange} required />
          <Input label="Street Name" name="streetName" value={address.streetName} onChange={handleAddressChange} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="City" name="city" value={address.city} onChange={handleAddressChange} required />
          <Input label="Postal Code" name="postalCode" value={address.postalCode} onChange={handleAddressChange} onBlur={handleAddressBlur} error={postalError} required />
        </div>
      </div>

      {/* Members Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Members</h3>
        </div>
        
        <div className="space-y-6">
          {members.map((member, index) => (
            <div key={index} className="relative bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-700">Member {index + 1}</h4>
                {members.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeMember(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="First Name" name="firstName" value={member.firstName} onChange={(e) => handleMemberChange(index, e)} required />
                <Input label="Last Name" name="lastName" value={member.lastName} onChange={(e) => handleMemberChange(index, e)} required />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Email Address" type="email" name="email" value={member.email} onChange={(e) => handleMemberChange(index, e)} required />
                <Input label="Password" type="password" name="password" value={member.password} onChange={(e) => handleMemberChange(index, e)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone Number" type="tel" name="phoneNumber" value={member.phoneNumber} onChange={(e) => handleMemberChange(index, e)} onBlur={(e) => handleMemberBlur(index, e)} error={memberErrors[index]} required />
                <Select 
                  label="Gender" 
                  name="gender" 
                  value={member.gender} 
                  onChange={(e) => handleMemberChange(index, e)} 
                  options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other/Prefer not to say' }]} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Date of Birth" type="date" name="dateOfBirth" value={member.dateOfBirth} onChange={(e) => handleMemberChange(index, e)} required />
                <Select 
                  label="Membership Type" 
                  name="membershipType" 
                  value={member.membershipType} 
                  onChange={(e) => handleMemberChange(index, e)} 
                  options={plans
                    .filter(p => !p.isArchived || p.name === member.membershipType)
                    .map(p => ({ value: p.name, label: `${p.name} ($${p.cost}) - ${p.description || ''}${p.isArchived ? ' (Archived)' : ''}` }))} 
                  required 
                />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id={`free-lessons-${index}`}
                  name="wantsFreeLessons"
                  checked={member.wantsFreeLessons}
                  onChange={(e) => handleMemberChange(index, e)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`free-lessons-${index}`} className="text-sm font-medium text-gray-700">
                  I am interested in free tennis lessons
                </label>
              </div>
            </div>
          ))}
        </div>

        <button 
          type="button" 
          onClick={addMember}
          className="mt-4 w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          + Add Another Member to this Household
        </button>
      </div>

      <div className="mt-6">
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm text-center">
            {error}
          </div>
        )}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 px-4 rounded-md shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing Registration...' : 'Complete Registration'}
        </button>
      </div>
    </form>
  );
}
