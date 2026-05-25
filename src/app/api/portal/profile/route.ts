import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, phoneNumber, gender, streetNumber, streetName, city, postalCode, wantsFreeLessons } = body;

    if (postalCode && !isValidPostalCode(postalCode)) {
      return NextResponse.json({ error: 'Invalid Postal Code format. Please use a valid Canadian format (e.g. M1M 1M1).' }, { status: 400 });
    }

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format. Please use a standard 10-digit number.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId as string },
      data: {
        firstName,
        lastName,
        phoneNumber,
        gender,
        wantsFreeLessons,
        streetNumber,
        streetName,
        city,
        postalCode
      }
    });

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
