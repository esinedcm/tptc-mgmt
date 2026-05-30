import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function TreasurerReport() {
  // 1. Fetch Paid Memberships to calculate Amount Collected
  const paidMemberships = await prisma.membership.findMany({
    where: { status: 'Active', paymentRecordedAt: { not: null } }
  });
  
  const amountCollected = paidMemberships.reduce((sum, m) => sum + (m.amountPaid || 0), 0);

  // 2. Fetch Pending Memberships to calculate Amount Outstanding
  const pendingUsers = await prisma.user.findMany({
    where: { memberships: { some: { status: 'Pending' } } },
    include: { memberships: true }
  });

  // Group pending users by household
  const households: Record<string, typeof pendingUsers> = {};
  pendingUsers.forEach(u => {
    // If no householdId, group them individually using their own ID
    const hId = u.householdId || u.id;
    if (!households[hId]) households[hId] = [];
    households[hId].push(u);
  });

  // Fetch prices to calculate outstanding amounts
  const plans = await prisma.membershipPlan.findMany();
  const prices: Record<string, number> = {};
  plans.forEach(p => { prices[p.name] = p.cost; });
  const familyCost = plans.find(p => p.name === 'Family')?.cost || 200;

  let totalOutstanding = 0;
  const householdBalances: { id: string; name: string; amountOwed: number; members: string; emails: string }[] = [];

  Object.entries(households).forEach(([hId, members]) => {
    // Get all pending membership types for this household
    const pendingTypes: string[] = [];
    members.forEach(m => {
      m.memberships.filter(mem => mem.status === 'Pending').forEach(mem => {
        pendingTypes.push(mem.membershipType);
      });
    });

    if (pendingTypes.length === 0) return;

    let owed = 0;
    const manuallySelectedFamily = pendingTypes.includes('Family');

    if (manuallySelectedFamily) {
      owed = familyCost;
    } else {
      const numAdults = pendingTypes.filter(t => t === 'Adult').length;
      const numJuniors = pendingTypes.filter(t => t === 'Junior').length;
      const numSeniors = pendingTypes.filter(t => t === 'Senior').length;

      if (numAdults >= 2 && numJuniors >= 1) {
        owed += familyCost;
        const extraAdults = Math.max(0, numAdults - 2);
        const extraJuniors = Math.max(0, numJuniors - 2);
        owed += extraAdults * (prices['Adult'] || 85);
        owed += extraJuniors * (prices['Junior'] || 50);
        owed += numSeniors * (prices['Senior'] || 70);
      } else {
        owed = pendingTypes.reduce((sum, t) => sum + (prices[t] || 0), 0);
      }
    }

    if (owed > 0) {
      totalOutstanding += owed;
      
      const primaryMember = members[0];
      householdBalances.push({
        id: hId,
        name: `${primaryMember.firstName} ${primaryMember.lastName} ${members.length > 1 ? `(+${members.length - 1} members)` : ''}`,
        members: members.map(m => `${m.firstName} (${m.memberships.find(x => x.status === 'Pending')?.membershipType || 'Unknown'})`).join(', '),
        emails: Array.from(new Set(members.map(m => m.email))).join(', '),
        amountOwed: owed
      });
    }
  });

  const generatedDate = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Treasurer Report</h1>
            <p className="mt-1 text-sm text-gray-500">Date Generated: {generatedDate}</p>
          </div>
          <div className="flex gap-4 print:hidden">
            <PrintButton />
            <Link 
              href="/admin/reports" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Back to Reports
            </Link>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6 text-center">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Collected</dt>
              <dd className="mt-1 text-3xl font-bold text-green-600">${amountCollected.toFixed(2)}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6 text-center">
              <dt className="text-sm font-medium text-gray-500 truncate">Amount Outstanding</dt>
              <dd className="mt-1 text-3xl font-bold text-red-600">${totalOutstanding.toFixed(2)}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6 text-center">
              <dt className="text-sm font-medium text-gray-500 truncate">Projected Total</dt>
              <dd className="mt-1 text-3xl font-bold text-blue-600">${(amountCollected + totalOutstanding).toFixed(2)}</dd>
            </div>
          </div>
        </div>

        {/* Outstanding Balances Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Outstanding Household Balances</h3>
            <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {householdBalances.length} Pending
            </span>
          </div>
          
          <div className="overflow-x-auto print:overflow-visible">
            {householdBalances.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No outstanding balances found. All members are paid!</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Member / Household</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Emails</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members (Plan Types)</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {householdBalances.map((hh) => (
                    <tr key={hh.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal text-sm font-medium text-gray-900">
                        {hh.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal text-sm text-gray-500">
                        {hh.emails}
                      </td>
                      <td className="px-6 py-4 text-sm print:whitespace-normal text-gray-500">
                        {hh.members}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal text-right text-sm font-bold text-red-600">
                        ${hh.amountOwed.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
