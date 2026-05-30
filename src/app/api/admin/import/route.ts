import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/hash';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const records = await request.json();

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
    const activeSeason = settings?.activeSeason || '2026';

    let importedCount = 0;
    let skippedCount = 0;
    const skippedRecords: Array<{ email: string; name: string; reason: string }> = [];

    // We get the max member number to keep it sequential
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const yearPrefix = currentYear + '-';
    const lastUser = await prisma.user.findFirst({
      where: { memberNumber: { startsWith: yearPrefix } },
      orderBy: { memberNumber: 'desc' }
    });

    let nextSequence = 1;
    if (lastUser && lastUser.memberNumber) {
      const parts = lastUser.memberNumber.split('-');
      if (parts.length === 2) {
        const parsedSeq = parseInt(parts[1], 10);
        if (!isNaN(parsedSeq)) {
          nextSequence = parsedSeq + 1;
        }
      }
    }

    // Default password to hash
    const defaultPasswordHash = await hashPassword(crypto.randomBytes(16).toString('hex'));

    const householdMap = new Map<string, string>();

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        const email = (record.Email || record.email || '').toString().toLowerCase().trim();
        const firstName = (record['First Name'] || record.firstName || '').toString().trim();
        const lastName = (record['Last Name'] || record.lastName || '').toString().trim();
        const phoneNumber = (record.Phone || record.phoneNumber || record['Phone Number'] || '').toString().trim();
        const membershipType = (record.Type || record.type || record.membershipType || record['Membership Type'] || record.Plan || record.plan || 'Adult').toString().trim();
        const gender = (record.Gender || record.gender || '').toString().trim();
        
        const isPaidStr = (record.Paid || record.paid || record['Amount Paid'] || record.amountPaid || record['Payment Status'] || record.Status || record.status || '').toString().toLowerCase().trim();
        const hasPaid = isPaidStr === 'yes' || isPaidStr === 'true' || isPaidStr === 'y' || parseFloat(isPaidStr) > 0 || isPaidStr === 'active' || isPaidStr === 'paid';
        const finalStatus = hasPaid ? 'Active' : 'Pending';
        const amountPaid = hasPaid && !isNaN(parseFloat(isPaidStr)) ? parseFloat(isPaidStr) : null;
        
        const householdRef = (record.Household || record['Household ID'] || record.household || record.Family || record.family || '').toString().trim();
        let householdId = null;
        if (householdRef) {
          if (!householdMap.has(householdRef)) {
            householdMap.set(householdRef, crypto.randomUUID());
          }
          householdId = householdMap.get(householdRef);
        }

        if (!email || !firstName || !lastName) {
          skippedCount++;
          skippedRecords.push({ email: email || 'Unknown', name: `${firstName} ${lastName}`.trim() || 'Unknown', reason: 'Missing required fields (Email, First Name, or Last Name)' });
          continue; // Skip invalid records
        }

        // Check if user already exists
        const existingUser = await tx.user.findUnique({ where: { email } });
        
        if (existingUser) {
          // Check if they already have a membership for the active season
          const existingMembership = await tx.membership.findFirst({
            where: { userId: existingUser.id, season: activeSeason }
          });

          if (!existingMembership) {
            await tx.membership.create({
              data: {
                userId: existingUser.id,
                membershipType,
                season: activeSeason,
                status: finalStatus,
                amountPaid: amountPaid,
              }
            });
            importedCount++;
          } else {
            skippedCount++;
            skippedRecords.push({ email, name: `${firstName} ${lastName}`, reason: `Already has an active membership for ${activeSeason}` });
          }
        } else {
          // Create new user
          const memberNumber = `${yearPrefix}${String(nextSequence).padStart(3, '0')}`;
          nextSequence++;
          
          const resetToken = crypto.randomUUID();
          const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

          await tx.user.create({
            data: {
              email,
              firstName,
              lastName,
              phoneNumber,
              gender,
              passwordHash: defaultPasswordHash,
              memberNumber,
              householdId,
              resetToken,
              resetTokenExpiry,
              welcomeEmailSent: false,
              memberships: {
                create: {
                  membershipType,
                  season: activeSeason,
                  status: finalStatus,
                  amountPaid: amountPaid,
                }
              }
            }
          });
          importedCount++;
        }
      }
    }, {
      timeout: 30000, // Increase timeout for large imports
    });

    return NextResponse.json({ success: true, importedCount, skippedCount, skippedRecords });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during import' }, { status: 500 });
  }
}
