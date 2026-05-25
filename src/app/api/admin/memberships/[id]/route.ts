import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, gender, dateOfBirth, wantsFreeLessons, membershipType, streetNumber, streetName, city, postalCode, tagNumber, amountPaid, paymentNotes, paymentRecordedAt } = body;

    if (!id) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    if (postalCode && !isValidPostalCode(postalCode)) {
      return NextResponse.json({ error: 'Invalid Postal Code format. Please use a valid Canadian format (e.g. M1M 1M1).' }, { status: 400 });
    }

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format. Please use a standard 10-digit number.' }, { status: 400 });
    }

    // Find the membership to ensure it exists
    const membership = await prisma.membership.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Update the membership and the associated user
    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id },
        data: {
          membershipType,
          amountPaid: amountPaid ? parseFloat(amountPaid) : null,
          paymentNotes: paymentNotes || null,
          paymentRecordedAt: paymentRecordedAt ? new Date(paymentRecordedAt) : null,
        }
      });

      await tx.user.update({
        where: { id: membership.userId },
        data: {
          firstName,
          lastName,
          email,
          phoneNumber,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          wantsFreeLessons: wantsFreeLessons || false,
          streetNumber,
          streetName,
          city,
          postalCode,
          tagNumber,
        }
      });

      // Sync address to all other users in the same household
      if (membership.user.householdId) {
        await tx.user.updateMany({
          where: { householdId: membership.user.householdId },
          data: {
            streetNumber,
            streetName,
            city,
            postalCode,
          }
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Update membership error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Delete membership and user in a transaction, but copy to ArchivedMembership first
    await prisma.$transaction(async (tx) => {
      // Archive first
      await tx.archivedMembership.create({
        data: {
          originalUserId: membership.userId,
          originalMembershipId: membership.id,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          phoneNumber: membership.user.phoneNumber,
          gender: membership.user.gender,
          dateOfBirth: membership.user.dateOfBirth,
          wantsFreeLessons: membership.user.wantsFreeLessons,
          membershipType: membership.membershipType,
          status: membership.status,
          amountPaid: membership.amountPaid,
          paymentNotes: membership.paymentNotes,
          paymentRecordedAt: membership.paymentRecordedAt,
          originalCreatedAt: membership.createdAt,
        }
      });

      // Then delete
      await tx.membership.deleteMany({
        where: { userId: membership.userId }
      });
      await tx.user.delete({
        where: { id: membership.userId }
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete membership error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
