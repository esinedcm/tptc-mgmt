import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 400 });
    }

    // Find the user by resetToken
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired renewal link' }, { status: 400 });
    }

    // Load the whole household using householdId if it exists, otherwise just the user
    let users = [];
    if (user.householdId) {
      users = await prisma.user.findMany({
        where: { householdId: user.householdId },
        include: { memberships: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      users = await prisma.user.findMany({
        where: { id: user.id },
        include: { memberships: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Format back into the shape the form expects
    const address = {
      streetNumber: users[0].streetNumber || '',
      streetName: users[0].streetName || '',
      city: users[0].city || '',
      postalCode: users[0].postalCode || '',
    };

    const members = users.map(u => ({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: '', // Prompt to optionally reset/set? Actually, let's leave it blank and we just won't update password if it's blank.
      phoneNumber: u.phoneNumber || '',
      gender: u.gender || '',
      dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
      wantsFreeLessons: u.wantsFreeLessons,
      membershipType: u.memberships[0]?.membershipType || '',
    }));

    // Generate a fresh editToken for this new registration/renewal submission
    return NextResponse.json({ address, members }, { status: 200 });
  } catch (error) {
    console.error('Fetch renewal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
