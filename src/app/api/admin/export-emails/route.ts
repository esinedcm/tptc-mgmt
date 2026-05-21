import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all users who have an active or pending membership
    // If you only want 'Active' members, you could filter by membership status.
    // For now, we'll fetch all unique users who have at least one membership.
    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: {} // At least one membership
        }
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        memberNumber: true,
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    // Create CSV header
    let csvContent = 'Member Number,First Name,Last Name,Email\n';

    // Add rows
    users.forEach(user => {
      // Escape fields that might contain commas
      const memberNumber = user.memberNumber ? `"${user.memberNumber}"` : '';
      const firstName = `"${user.firstName.replace(/"/g, '""')}"`;
      const lastName = `"${user.lastName.replace(/"/g, '""')}"`;
      const email = `"${user.email.replace(/"/g, '""')}"`;
      
      csvContent += `${memberNumber},${firstName},${lastName},${email}\n`;
    });

    // Return as a downloadable CSV file
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', 'attachment; filename="member_emails.csv"');

    return new NextResponse(csvContent, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Export emails error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
