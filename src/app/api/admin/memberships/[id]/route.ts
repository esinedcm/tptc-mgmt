import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendProfileUpdatedEmail } from '@/lib/email';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, gender, dateOfBirth, membershipType, streetNumber, streetName, city, postalCode, tagNumber, amountPaid, paymentNotes, paymentRecordedAt } = body;

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

    const changes: { field: string, oldVal: string, newVal: string }[] = [];
    if (membership.membershipType !== membershipType) {
      changes.push({ field: 'Membership Type', oldVal: membership.membershipType, newVal: membershipType });
    }
    if (membership.user.firstName !== firstName) {
      changes.push({ field: 'First Name', oldVal: membership.user.firstName, newVal: firstName });
    }
    if (membership.user.lastName !== lastName) {
      changes.push({ field: 'Last Name', oldVal: membership.user.lastName, newVal: lastName });
    }
    if (membership.user.email !== email) {
      changes.push({ field: 'Email Address', oldVal: membership.user.email, newVal: email });
    }
    if ((membership.user.phoneNumber || '') !== (phoneNumber || '')) {
      changes.push({ field: 'Phone Number', oldVal: membership.user.phoneNumber || '', newVal: phoneNumber || '' });
    }
    if ((membership.user.gender || '') !== (gender || '')) {
      changes.push({ field: 'Gender', oldVal: membership.user.gender || '', newVal: gender || '' });
    }
    const oldDobStr = membership.user.dateOfBirth ? membership.user.dateOfBirth.toISOString().split('T')[0] : '';
    const newDobStr = dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : '';
    if (oldDobStr !== newDobStr) {
      changes.push({ field: 'Date of Birth', oldVal: oldDobStr || '', newVal: newDobStr || '' });
    }
    if ((membership.user.streetNumber || '') !== (streetNumber || '')) {
      changes.push({ field: 'Street No.', oldVal: membership.user.streetNumber || '', newVal: streetNumber || '' });
    }
    if ((membership.user.streetName || '') !== (streetName || '')) {
      changes.push({ field: 'Street Name', oldVal: membership.user.streetName || '', newVal: streetName || '' });
    }
    if ((membership.user.city || '') !== (city || '')) {
      changes.push({ field: 'City', oldVal: membership.user.city || '', newVal: city || '' });
    }
    if ((membership.user.postalCode || '') !== (postalCode || '')) {
      changes.push({ field: 'Postal Code', oldVal: membership.user.postalCode || '', newVal: postalCode || '' });
    }
    if ((membership.user.tagNumber || '') !== (tagNumber || '')) {
      changes.push({ field: 'Tag Number', oldVal: membership.user.tagNumber || '', newVal: tagNumber || '' });
    }
    if (membership.amountPaid !== (amountPaid ? parseFloat(amountPaid) : null)) {
      changes.push({ field: 'Amount Paid', oldVal: String(membership.amountPaid || '0'), newVal: String(amountPaid || '0') });
    }
    if ((membership.paymentNotes || '') !== (paymentNotes || '')) {
      changes.push({ field: 'Payment Notes', oldVal: membership.paymentNotes || '', newVal: paymentNotes || '' });
    }
    const oldDateStr = membership.paymentRecordedAt ? membership.paymentRecordedAt.toISOString().split('T')[0] : '';
    const newDateStr = paymentRecordedAt ? new Date(paymentRecordedAt).toISOString().split('T')[0] : '';
    if (oldDateStr !== newDateStr) {
      changes.push({ field: 'Payment Date', oldVal: oldDateStr || 'None', newVal: newDateStr || 'None' });
    }

    let emailPreviewUrl = null;
    if (changes.length > 0) {
      // Send the email to their new email (or old if they didn't change it)
      emailPreviewUrl = await sendProfileUpdatedEmail(email || membership.user.email, changes);
    }

    return NextResponse.json({ success: true, emailPreviewUrl }, { status: 200 });
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
