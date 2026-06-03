import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function formatDate(date: Date, isAllDay: boolean = false): string {
  if (isAllDay) {
    // Format: YYYYMMDD
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
  // Format: YYYYMMDDThhmmssZ
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function foldLine(line: string): string {
  // iCal lines should not be longer than 75 characters.
  const MAX_LENGTH = 75;
  if (line.length <= MAX_LENGTH) return line;
  
  let folded = '';
  let current = line;
  while (current.length > MAX_LENGTH) {
    folded += current.substring(0, MAX_LENGTH) + '\r\n ';
    current = current.substring(MAX_LENGTH);
  }
  folded += current;
  return folded;
}

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
      select: { activeSeason: true }
    });
    const activeSeason = settings?.activeSeason || '2026';

    const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || 'Tennis Club';

    // 1. Fetch Social Events
    const clubEvents = await prisma.clubEvent.findMany({
      where: { season: activeSeason }
    });

    // 2. Fetch Admin Bookings
    const adminBookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        type: { not: 'MEMBER' }
      },
      include: {
        court: { select: { name: true } },
        organizer: { select: { firstName: true, lastName: true } }
      }
    });

    const nowStr = formatDate(new Date());
    const lines: string[] = [];

    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push(`PRODID:-//${clubName}//Events Calendar//EN`);
    lines.push('CALSCALE:GREGORIAN');
    lines.push(`X-WR-CALNAME:${clubName} Events`);
    lines.push('METHOD:PUBLISH');

    // Add Social Events
    for (const e of clubEvents) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:event-${e.id}@tptc-mgmt.local`);
      lines.push(`DTSTAMP:${nowStr}`);
      
      if (e.isAllDay) {
        // All day events need VALUE=DATE and +1 day for DTEND
        const nextDay = new Date(e.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        lines.push(`DTSTART;VALUE=DATE:${formatDate(e.startDate, true)}`);
        lines.push(`DTEND;VALUE=DATE:${formatDate(nextDay, true)}`);
      } else {
        lines.push(`DTSTART:${formatDate(e.startDate)}`);
        lines.push(`DTEND:${formatDate(e.endDate)}`);
      }

      lines.push(`SUMMARY:${e.title}`);
      if (e.description) {
        lines.push(`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`);
      }
      lines.push('END:VEVENT');
    }

    // Group admin bookings by time, type, and notes to avoid duplicates for multi-court events
    const groupedBookings: Record<string, typeof adminBookings[0] & { courtNames: string[] }> = {};
    for (const b of adminBookings) {
      const key = `${b.startTime.getTime()}-${b.endTime.getTime()}-${b.type}-${b.notes || ''}`;
      if (!groupedBookings[key]) {
        groupedBookings[key] = { ...b, courtNames: [b.court.name] };
      } else {
        groupedBookings[key].courtNames.push(b.court.name);
        groupedBookings[key].courtNames.sort();
      }
    }

    // Add Admin Bookings
    for (const b of Object.values(groupedBookings)) {
      const courtDisplay = b.courtNames.length > 2 ? 'All Courts' : b.courtNames.join(', ');
      const title = b.notes || `${b.type} (${courtDisplay})`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:booking-${b.id}@tptc-mgmt.local`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART:${formatDate(b.startTime)}`);
      lines.push(`DTEND:${formatDate(b.endTime)}`);
      lines.push(`SUMMARY:${title}`);
      
      const desc = b.organizer ? `Organizer: ${b.organizer.firstName} ${b.organizer.lastName}` : '';
      if (desc) lines.push(`DESCRIPTION:${desc}`);
      
      lines.push(`LOCATION:${courtDisplay}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const icsContent = lines.map(foldLine).join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="club-events.ics"',
      },
    });
  } catch (error) {
    console.error('ICS Feed error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
