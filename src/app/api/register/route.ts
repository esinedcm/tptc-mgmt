import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/hash';
import { sendEditLinkEmail, sendAdminNewRegistrationEmail } from '@/lib/email';
import { isValidPostalCode, isValidPhoneNumber } from '@/lib/validation';
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
        dateOfBirth: string;
        wantsFreeLessons?: boolean;
        membershipType: string;
      }[];
      editToken?: string;
      leadId?: string;
      renewalToken?: string;
    } = await request.json();
    const { address, members, editToken, leadId, renewalToken } = body;

    if (!address || !members || members.length === 0) {
      return NextResponse.json({ error: 'Missing household address or members' }, { status: 400 });
    }

    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
    const activeSeason = settings?.activeSeason || '2026';

    if (address.postalCode && !isValidPostalCode(address.postalCode)) {
      return NextResponse.json({ error: 'Invalid Postal Code format. Please use a valid Canadian format (e.g. M1M 1M1).' }, { status: 400 });
    }

    for (let i = 0; i < members.length; i++) {

      if (members[i].phoneNumber && !isValidPhoneNumber(members[i].phoneNumber)) {
        return NextResponse.json({ error: `Invalid phone number format for Member ${i + 1}. Please use a standard 10-digit number.` }, { status: 400 });
      }
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

    const primaryMember = members[0];
    const existingUser = await prisma.user.findUnique({
      where: { email: primaryMember.email.toLowerCase().trim() }
    });

    if (existingUser && (!editToken || existingUser.editToken !== editToken) && !renewalToken) {
      return NextResponse.json({ 
        error: 'EMAIL_EXISTS',
        message: 'This email is already registered.' 
      }, { status: 400 });
    }

    if (renewalToken) {
      const tokenUser = await prisma.user.findUnique({ where: { resetToken: renewalToken } });
      if (!tokenUser || !tokenUser.resetTokenExpiry || tokenUser.resetTokenExpiry < new Date()) {
        return NextResponse.json({ error: 'Invalid or expired renewal link' }, { status: 400 });
      }
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
    
    const existingUsers = await prisma.user.findMany({
      where: { memberNumber: { startsWith: yearPrefix } },
      select: { memberNumber: true }
    });
    
    let nextSequence = 1;
    for (const u of existingUsers) {
      if (u.memberNumber) {
        const lastSeq = parseInt(u.memberNumber.split('-')[1], 10);
        if (!isNaN(lastSeq) && lastSeq >= nextSequence) {
          nextSequence = lastSeq + 1;
        }
      }
    }

    // Create users within a transaction to ensure all or nothing
    await prisma.$transaction(
      async (tx) => {
        if (editToken && !renewalToken) {
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

           if (renewalToken) {
             const updateData: any = {
               firstName: member.firstName,
               lastName: member.lastName,
               phoneNumber: member.phoneNumber,
               gender: member.gender,
               wantsFreeLessons: member.wantsFreeLessons || false,
               streetNumber: address.streetNumber,
               streetName: address.streetName,
               city: address.city,
               postalCode: address.postalCode,
               householdId,
               editToken: finalEditToken,
               memberNumber,
             };
             if (member.dateOfBirth) updateData.dateOfBirth = new Date(member.dateOfBirth);
             if (member.password) {
               updateData.passwordHash = await hashPassword(member.password);
             }

             await tx.user.upsert({
               where: { email: member.email },
               update: updateData,
               create: {
                 firstName: member.firstName,
                 lastName: member.lastName,
                 email: member.email,
                 passwordHash: member.password ? await hashPassword(member.password) : await hashPassword('pending'),
                 phoneNumber: member.phoneNumber,
                 gender: member.gender,
                 dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : null,
                 wantsFreeLessons: member.wantsFreeLessons || false,
                 streetNumber: address.streetNumber,
                 streetName: address.streetName,
                 city: address.city,
                 postalCode: address.postalCode,
                 householdId,
                 editToken: finalEditToken,
                 memberNumber,
               }
             });

             // Create a new membership for this season
             const userForMembership = await tx.user.findUnique({ where: { email: member.email } });
             if (userForMembership) {
               await tx.membership.create({
                 data: {
                   userId: userForMembership.id,
                   membershipType: member.membershipType,
                   season: activeSeason,
                   status: 'Pending',
                 }
               });
             }
           } else {
             const passwordHash = await hashPassword(member.password || '');
             await tx.user.create({
               data: {
                 firstName: member.firstName,
                 lastName: member.lastName,
                 email: member.email,
                 passwordHash,
                 phoneNumber: member.phoneNumber,
                 gender: member.gender,
                 dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : null,
                 wantsFreeLessons: member.wantsFreeLessons || false,
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
                     season: activeSeason,
                     status: 'Pending',
                   }
                 }
               }
             });
           }
        }

        if (renewalToken) {
          // Invalidate the reset token
          await tx.user.updateMany({
            where: { resetToken: renewalToken },
            data: { resetToken: null, resetTokenExpiry: null }
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

    // Calculate total due
    const plans = await prisma.membershipPlan.findMany();
    const prices: Record<string, number> = {};
    plans.forEach(p => { prices[p.name] = p.cost; });
    const familyPlan = plans.find(p => p.name === 'Family');
    const familyCost = familyPlan ? familyPlan.cost : 200;

    const manuallySelectedFamily = members.some((m) => m.membershipType === 'Family');
    let totalDue = 0;

    if (manuallySelectedFamily) {
      totalDue = familyCost;
    } else {
      const numAdults = members.filter(m => m.membershipType === 'Adult').length;
      const numJuniors = members.filter(m => m.membershipType === 'Junior').length;
      const numSeniors = members.filter(m => m.membershipType === 'Senior').length;

      if (numAdults >= 2 && numJuniors >= 1) {
        totalDue += familyCost;
        const extraAdults = Math.max(0, numAdults - 2);
        const extraJuniors = Math.max(0, numJuniors - 2);
        totalDue += extraAdults * (prices['Adult'] || 85);
        totalDue += extraJuniors * (prices['Junior'] || 50);
        totalDue += numSeniors * (prices['Senior'] || 70);
      } else {
        totalDue = members.reduce((sum, m) => sum + (prices[m.membershipType] || 0), 0);
      }
    }

    // Send email to Member 1
    const memberOneEmail = members[0].email;
    const memberNames = members.map(m => `${m.firstName} ${m.lastName}`);
    const emailPreviewUrl = await sendEditLinkEmail(memberOneEmail, finalEditToken, memberNames, totalDue);

    // Notify all admins of the new registration (only if this is a NEW registration, not an edit)
    if (!editToken) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true }
      });
      
      for (const admin of admins) {
        if (admin.email) {
          await sendAdminNewRegistrationEmail({
            to: admin.email,
            memberNames,
            totalDue
          });
        }
      }
    }

    return NextResponse.json({ success: true, editToken: finalEditToken, emailPreviewUrl }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
