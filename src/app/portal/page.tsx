import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MemberDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    redirect('/login');
  }

  const payload = await verifyJwt(token);
  if (!payload || !payload.userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: {
      memberships: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  const latestMembership = user.memberships[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.firstName}!</h1>
        <p className="mt-1 text-gray-500">Manage your membership and view club updates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Membership Status</h2>
          
          {latestMembership ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${
                  latestMembership.status === 'Active' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {latestMembership.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-900">{latestMembership.membershipType}</span>
              </div>
              {user.memberNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Member #</span>
                  <span className="font-medium text-gray-900">{user.memberNumber}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              No membership record found. If you recently applied, it may still be pending initial review in the system.
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg shadow-sm border border-indigo-100 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold text-indigo-900 mb-2">Court Bookings</h2>
            <p className="text-indigo-700/80 text-sm">
              We are rolling out our new digital court reservation system soon! Check back later to book your next match online.
            </p>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
