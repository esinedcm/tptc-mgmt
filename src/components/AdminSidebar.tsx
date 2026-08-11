'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminSidebar({ activeModules = ['core'] }: { activeModules?: string[] }) {
  const pathname = usePathname();
  const hasCourts = activeModules.includes('courts');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', href: '/admin' },
        ...(hasCourts ? [{ name: 'Calendar', href: '/admin/calendar' }] : []),
      ]
    },
    {
      title: 'Members',
      items: [
        { name: 'Directory', href: '/admin/members' },
        { name: 'Staff / Admins', href: '/admin/staff' },
        { name: 'Import', href: '/admin/members/import' },
      ]
    },
    {
      title: 'Bookings',
      items: [
        ...(hasCourts ? [{ name: 'Manage Bookings', href: '/admin/bookings' }] : []),
        { name: 'Social Events', href: '/admin/events' },
      ]
    },
    {
      title: 'Other',
      items: [
        { name: 'Reports', href: '/admin/reports' },
        { name: 'Settings', href: '/admin/settings' },
        { name: 'Feedback', href: '/admin/feedback' },
      ]
    }
  ];

  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "Tennis Club";

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setLogoUrl((window as any).CLUB_LOGO_URL || process.env.NEXT_PUBLIC_CLUB_LOGO_URL || null);
    }
  }, []);

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full min-h-screen flex flex-col shadow-sm flex-shrink-0 print:hidden">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                // exact match for /admin to avoid highlighting dashboard on subpages
                const isActive = item.href === '/admin' 
                  ? pathname === '/admin' 
                  : pathname?.startsWith(item.href);
                  
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
