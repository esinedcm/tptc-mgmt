import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function PaidMembersReport() {
  const memberships = await prisma.membership.findMany({
    where: {
      paymentRecordedAt: { not: null }
    },
    include: {
      user: true
    },
    orderBy: {
      paymentRecordedAt: 'desc'
    }
  });

  const totalRevenue = memberships.reduce((sum, m) => sum + (m.amountPaid || 0), 0);
  const generatedDate = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Paid Members Report</h1>
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

        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-400">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-400 bg-gray-50">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Paid Memberships</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Total Revenue: <span className="font-bold text-green-600">${totalRevenue.toFixed(2)}</span>
              </p>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {memberships.length} Paid Records
            </span>
          </div>
          
          <div className="overflow-x-auto print:overflow-visible">
            {memberships.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No paid memberships found.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Date Paid</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-400">
                  {memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{m.user.firstName} {m.user.lastName}</div>
                            <div className="text-sm text-gray-500">ID: {m.user.memberNumber || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal">
                        <div className="text-sm text-gray-900">{m.user.email}</div>
                        <div className="text-sm text-gray-500">{m.user.phoneNumber || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {m.membershipType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal text-right text-sm font-bold text-green-600">
                        ${m.amountPaid || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal text-right text-sm text-gray-500">
                        {m.paymentRecordedAt ? new Date(m.paymentRecordedAt).toLocaleDateString() : 'N/A'}
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
