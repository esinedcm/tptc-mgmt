import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/hash';
import { sendEditLinkEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body: {
      address?: {
        streetNumber: string;
        streetName: string;
        city: string;
        postalCode: string;
      };
      members?: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string;
        password?: string;
        gender: string;
        membershipType: string;
      }[];
      editToken?: string;
      leadId?: string;
    } = await request.json();
    const { address, members, editToken, leadId } = body;

    if (!address || !members || members.length === 0) {
      return NextResponse.json({ error: 'Missing household address or members' }, { status: 400 });
    }

    // Validate emails are unique within the incoming request
    const emails = members.map((m: { email: string }) => m.email);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
       return NextResponse.json({ error: 'Duplicate emails found in the registration form' }, { status: 400 });
    }

    // If editToken is provided, exclude current household from "already registered" check
    let excludeEmailsCheck: { editToken?: { not: string } } = {};
    if (editToken) {
      excludeEmailsCheck = { editToken: { not: editToken } };
    }

    const existingUsers = await prisma.user.findMany({ 
      where: { 
        email: { in: emails },
        ...excludeEmailsCheck
      } 
    });

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: `Emails already registered: ${existingUsers.map(u => u.email).join(', ')}` }, { status: 400 });
    }

    const finalEditToken = editToken || crypto.randomUUID();
    const householdId = finalEditToken; 

    // Find existing member numbers if this is an edit
    const existingMemberNumbers: Record<string, string> = {};
    if (editToken) {
      const oldUsers = await prisma.user.findMany({ where: { editToken } });
      for (const u of oldUsers) {
        if (u.memberNumber) existingMemberNumbers[u.email] = u.memberNumber;
      }
    }

    // Determine sequence for new members
    const currentYear = new Date().getFullYear();
    const yearPrefix = currentYear.toString().slice(-2) + '-';
    
    const lastUser = await prisma.user.findFirst({
      where: { memberNumber: { startsWith: yearPrefix } },
      orderBy: { memberNumber: 'desc' }
    });
    
    let nextSequence = 1;
    if (lastUser && lastUser.memberNumber) {
      const lastSeq = parseInt(lastUser.memberNumber.split('-')[1], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }

    // Create users within a transaction to ensure all or nothing
    await prisma.$transaction(
      async (tx) => {
        if (editToken) {
          // Delete memberships then users for this token
          await tx.membership.deleteMany({
            where: { user: { editToken } }
          });
          await tx.user.deleteMany({
            where: { editToken }
          });
        }

        for (const member of members) {
           let memberNumber = existingMemberNumbers[member.email];
           if (!memberNumber) {
             memberNumber = `${yearPrefix}${String(nextSequence).padStart(3, '0')}`;
             nextSequence++;
           }

           const passwordHash = await hashPassword(member.password || '');
           await tx.user.create({
             data: {
               firstName: member.firstName,
               lastName: member.lastName,
               email: member.email,
               passwordHash,
               phoneNumber: member.phoneNumber,
               gender: member.gender,
               streetNumber: address.streetNumber,
               streetName: address.streetName,
               city: address.city,
               postalCode: address.postalCode,
               householdId,
               editToken: finalEditToken,
               memberNumber,
               memberships: {
                 create: {
                   membershipType: member.membershipType,
                   status: 'Pending',
                 }
               }
             }
           });
        }

        // If a leadId was provided, mark the lead as converted
        if (leadId) {
          await tx.lead.update({
            where: { id: leadId },
            data: { status: 'Converted' }
          });
        }
      }
    );

    // Send email to Member 1
    const memberOneEmail = members[0].email;
    const emailPreviewUrl = await sendEditLinkEmail(memberOneEmail, finalEditToken);

    return NextResponse.json({ success: true, editToken: finalEditToken, emailPreviewUrl }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
