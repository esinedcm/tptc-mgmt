import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function AdminDashboardLanding() {
  const [
    totalMemberships,
    activeMemberships,
    pendingMemberships,
    pendingLeads
  ] = await Promise.all([
    prisma.membership.count(),
    prisma.membership.count({ 
      where: { status: 'Active' } 
    }),
    prisma.membership.count({ 
      where: { status: 'Pending' } 
    }),
    prisma.lead.count({ 
      where: { status: 'Pending' } 
    }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard 
          title="Total Memberships" 
          value={totalMemberships} 
          href="/admin/members" 
          color="bg-blue-50 border-blue-200 text-blue-900" 
          valueColor="text-blue-700"
        />
        <DashboardCard 
          title="Active Memberships" 
          value={activeMemberships} 
          href="/admin/members" 
          color="bg-green-50 border-green-200 text-green-900" 
          valueColor="text-green-700"
        />
        <DashboardCard 
          title="Pending Memberships" 
          value={pendingMemberships} 
          href="/admin/members" 
          color="bg-yellow-50 border-yellow-200 text-yellow-900" 
          valueColor="text-yellow-700"
        />
        <DashboardCard 
          title="Pending Prospects" 
          value={pendingLeads} 
          href="/admin/members"
          color="bg-purple-50 border-purple-200 text-purple-900" 
          valueColor="text-purple-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <ul className="space-y-3">
            <li>
              <Link href="/admin/members" className="text-primary-600 hover:text-primary-800 flex items-center">
                <span className="mr-2">→</span> Manage Members
              </Link>
            </li>
            <li>
              <Link href="/admin/bookings" className="text-primary-600 hover:text-primary-800 flex items-center">
                <span className="mr-2">→</span> Manage Bookings
              </Link>
            </li>
            <li>
              <Link href="/admin/calendar" className="text-primary-600 hover:text-primary-800 flex items-center">
                <span className="mr-2">→</span> View Club Calendar
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, href, color, valueColor }: { title: string; value: number; href: string; color: string; valueColor: string }) {
  return (
    <Link href={href} className="block group">
      <div className={`p-6 rounded-lg shadow-sm border transition-shadow hover:shadow-md h-full ${color}`}>
        <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-2">{title}</h3>
        <p className={`text-4xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </Link>
  );
}
