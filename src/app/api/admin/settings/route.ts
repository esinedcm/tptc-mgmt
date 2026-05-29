import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' }
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: { id: 'global', cancellationCutoffMinutes: 90, maxHoursPerDay: 2, maxDaysInAdvance: 3, courtOpenTime: 6, courtCloseTime: 23, calendarDaysToShow: 3, calendarSkipDays: 1, primaryColor: '#4f46e5', genderOptions: ['Male', 'Female', 'Prefer not to say'] }
      });
    }

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { cancellationCutoffMinutes, maxHoursPerDay, maxDaysInAdvance, courtOpenTime, courtCloseTime, calendarDaysToShow, calendarSkipDays, primaryColor, genderOptions } = await req.json();

    const updateData: any = {};
    if (typeof cancellationCutoffMinutes === 'number') updateData.cancellationCutoffMinutes = cancellationCutoffMinutes;
    if (typeof maxHoursPerDay === 'number') updateData.maxHoursPerDay = maxHoursPerDay;
    if (typeof maxDaysInAdvance === 'number') updateData.maxDaysInAdvance = maxDaysInAdvance;
    if (typeof courtOpenTime === 'number') updateData.courtOpenTime = courtOpenTime;
    if (typeof courtCloseTime === 'number') updateData.courtCloseTime = courtCloseTime;
    if (typeof calendarDaysToShow === 'number') updateData.calendarDaysToShow = calendarDaysToShow;
    if (typeof calendarSkipDays === 'number') updateData.calendarSkipDays = calendarSkipDays;
    if (typeof primaryColor === 'string') updateData.primaryColor = primaryColor;
    if (Array.isArray(genderOptions)) updateData.genderOptions = genderOptions;

    const settings = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: { 
        id: 'global', 
        cancellationCutoffMinutes: typeof cancellationCutoffMinutes === 'number' ? cancellationCutoffMinutes : 90,
        maxHoursPerDay: typeof maxHoursPerDay === 'number' ? maxHoursPerDay : 2,
        maxDaysInAdvance: typeof maxDaysInAdvance === 'number' ? maxDaysInAdvance : 3,
        courtOpenTime: typeof courtOpenTime === 'number' ? courtOpenTime : 6,
        courtCloseTime: typeof courtCloseTime === 'number' ? courtCloseTime : 23,
        calendarDaysToShow: typeof calendarDaysToShow === 'number' ? calendarDaysToShow : 3,
        calendarSkipDays: typeof calendarSkipDays === 'number' ? calendarSkipDays : 1,
        primaryColor: typeof primaryColor === 'string' ? primaryColor : '#4f46e5',
        genderOptions: Array.isArray(genderOptions) ? genderOptions : ['Male', 'Female', 'Prefer not to say']
      }
    });

    return NextResponse.json({ success: true, settings }, { status: 200 });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
