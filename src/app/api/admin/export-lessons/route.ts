import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const interestedMembers = await prisma.user.findMany({
      where: {
        wantsFreeLessons: true
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        memberships: {
          select: {
            membershipType: true
          },
          take: 1
        }
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    const csvHeaders = ['First Name', 'Last Name', 'Email', 'Phone Number', 'Membership Type'];
    
    const csvRows = interestedMembers.map(member => {
      const type = member.memberships[0]?.membershipType || 'N/A';
      return [
        `"${member.firstName.replace(/"/g, '""')}"`,
        `"${member.lastName.replace(/"/g, '""')}"`,
        `"${member.email.replace(/"/g, '""')}"`,
        `"${(member.phoneNumber || '').replace(/"/g, '""')}"`,
        `"${type}"`
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="free-lessons-interest.csv"`,
      },
    });
  } catch (error) {
    console.error('Export lessons error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
