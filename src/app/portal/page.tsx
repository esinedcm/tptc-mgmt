import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import MyBookingsList from './MyBookingsList';

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
      },
      participatingBookings: {
        include: { court: true },
        orderBy: { startTime: 'desc' }
      }
    }
  });

  const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
  const cutoffMinutes = settings?.cancellationCutoffMinutes ?? 90;

  if (!user) {
    redirect('/login');
  }

  const latestMembership = user.memberships[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.firstName}!</h1>
        <p className="mt-1 text-gray-500">Manage your membership and view court bookings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-400">
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

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-400 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Court Bookings</h2>
            {latestMembership?.status === 'Active' && (
              <Link href="/portal/book" className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors shadow-sm">
                Book a Court
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2">
            <MyBookingsList 
              initialBookings={user.participatingBookings as any} 
              cutoffMinutes={cutoffMinutes} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
