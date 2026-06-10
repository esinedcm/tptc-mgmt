import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EventsListClient from './EventsListClient';

export const dynamic = 'force-dynamic';

export default async function PortalEventsPage() {
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
      eventRegistrations: true,
      memberships: true
    }
  });

  if (!user) {
    redirect('/login');
  }

  let householdMembers: any[] = [];
  if (user.householdId) {
    householdMembers = await prisma.user.findMany({
      where: { householdId: user.householdId, id: { not: user.id } },
      select: { id: true, firstName: true, lastName: true }
    });
  }

  const settings = await prisma.systemSetting.findUnique({
    where: { id: 'global' },
    select: { activeSeason: true }
  });
  const activeSeason = settings?.activeSeason || '2026';

  const upcomingEvents = await prisma.clubEvent.findMany({
    where: { 
      season: activeSeason,
      endDate: { gte: new Date() } // only future/ongoing events
    },
    include: {
      _count: {
        select: { registrations: true }
      },
      registrations: {
        include: {
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    },
    orderBy: { startDate: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upcoming Social Events</h1>
        <p className="mt-1 text-gray-500">Register yourself and your household members for club events.</p>
      </div>

      <EventsListClient 
        events={upcomingEvents} 
        currentUser={user as any} 
        householdMembers={householdMembers} 
        hasActiveMembership={user?.memberships?.some((m: any) => m.status === 'Active') || false}
      />
    </div>
  );
}
