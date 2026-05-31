import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendImportWelcomeEmail, sendRenewalLinkEmail, sendInterestConfirmationEmail, sendEditLinkEmail, sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, leadId, type } = body;

    if (!type || (!userId && !leadId)) {
      return NextResponse.json({ error: 'Missing identifier or type' }, { status: 400 });
    }

    if (type !== 'welcome' && type !== 'renewal' && type !== 'interest' && type !== 'pending' && type !== 'import-welcome') {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    if (type === 'interest') {
      if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      
      await sendInterestConfirmationEmail({
        to: lead.email,
        firstName: lead.firstName,
        leadId: lead.id,
      });
      return NextResponse.json({ success: true });
    }

    // Existing user logic
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let resetToken = user.resetToken;
    let resetTokenExpiry = user.resetTokenExpiry;

    if (!resetToken || !resetTokenExpiry || resetTokenExpiry < new Date()) {
      resetToken = crypto.randomUUID();
      resetTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 
      
      await prisma.user.update({
        where: { id: userId },
        data: { resetToken, resetTokenExpiry }
      });
    }

    if (type === 'welcome') {
      await sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        memberNumber: user.memberNumber,
      });

      await prisma.user.update({
        where: { id: userId },
        data: { welcomeEmailSent: true }
      });
    } else if (type === 'import-welcome') {
      await sendImportWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        resetToken: resetToken,
      });

      await prisma.user.update({
        where: { id: userId },
        data: { welcomeEmailSent: true }
      });
    } else if (type === 'renewal') {
      await sendRenewalLinkEmail(user.email, resetToken);
    } else if (type === 'pending') {
      // Find all household members to list their names and calculate total due
      const householdUsers = await prisma.user.findMany({
        where: { householdId: user.householdId || user.id },
        include: {
          memberships: {
            where: { season: String(new Date().getFullYear()) }
          }
        }
      });
      
      const memberNames = householdUsers.map(u => `${u.firstName} ${u.lastName}`);
      
      const plans = await prisma.membershipPlan.findMany();
      let totalDue = 0;
      let hasFamily = false;
      let familyCost = 0;

      for (const u of householdUsers) {
        if (u.memberships.length > 0) {
          const type = u.memberships[0].membershipType;
          if (type === 'Family') {
            hasFamily = true;
          } else {
            const plan = plans.find(p => p.name === type);
            totalDue += (plan?.cost || 0);
          }
        }
      }

      if (hasFamily) {
        const fPlan = plans.find(p => p.name === 'Family');
        familyCost = fPlan?.cost || 0;
        totalDue = familyCost;
      }
      
      let editToken = user.editToken;
      if (!editToken) {
        editToken = crypto.randomBytes(32).toString('hex');
        await prisma.user.update({ where: { id: user.id }, data: { editToken } });
      }

      await sendEditLinkEmail(user.email, editToken, memberNames, totalDue);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resending email:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
