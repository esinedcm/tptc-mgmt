import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { editToken: token },
      include: {
        memberships: true,
      },
      orderBy: {
        createdAt: 'asc', // Preserves order
      }
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
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
      password: '', // We don't send the password back
      phoneNumber: u.phoneNumber || '',
      membershipType: u.memberships[0]?.membershipType || '',
    }));

    return NextResponse.json({ address, members }, { status: 200 });
  } catch (error) {
    console.error('Fetch registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
