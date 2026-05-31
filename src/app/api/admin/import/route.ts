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
    
    // Fetch all current year member numbers to find the true mathematical maximum
    const existingUsers = await prisma.user.findMany({
      where: { memberNumber: { startsWith: yearPrefix } },
      select: { memberNumber: true }
    });

    let nextSequence = 1;
    for (const u of existingUsers) {
      if (u.memberNumber) {
        const parts = u.memberNumber.split('-');
        if (parts.length === 2) {
          const parsedSeq = parseInt(parts[1], 10);
          if (!isNaN(parsedSeq) && parsedSeq >= nextSequence) {
            nextSequence = parsedSeq + 1;
          }
        }
      }
    }

    // Default password to hash
    const defaultPasswordHash = await hashPassword(crypto.randomBytes(16).toString('hex'));

    const householdMap = new Map<string, string>();

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        const email = (record.email || '').toString().toLowerCase().trim();
        const firstName = (record.firstName || '').toString().trim();
        const lastName = (record.lastName || '').toString().trim();
        
        // Optional Fields
        const phoneNumber = (record.phoneNumber || '').toString().trim();
        const gender = (record.gender || '').toString().trim();
        const streetNumber = (record.streetNumber || '').toString().trim();
        const streetName = (record.streetName || '').toString().trim();
        const city = (record.city || '').toString().trim();
        const postalCode = (record.postalCode || '').toString().trim();
        const tagNumber = (record.tagNumber || '').toString().trim();
        
        const membershipType = (record.membershipType || 'Adult').toString().trim();
        
        // Payment fields
        const finalStatus = (record.status || 'Pending').toString().trim();
        const amountPaid = record.amountPaid !== undefined && record.amountPaid !== null && record.amountPaid !== '' ? parseFloat(record.amountPaid) : null;
        const paymentNotes = (record.paymentNotes || '').toString().trim();
        
        let paymentRecordedAt = null;
        if (record.paymentRecordedAt) {
          const parsedDate = new Date(record.paymentRecordedAt);
          if (!isNaN(parsedDate.getTime())) {
            paymentRecordedAt = parsedDate;
          }
        }
        
        const householdRef = (record.householdId || '').toString().trim();
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
          // Update user if they exist with any new optional fields they might not have had
          const updateData: any = {};
          if (householdId && existingUser.householdId !== householdId) updateData.householdId = householdId;
          if (phoneNumber && !existingUser.phoneNumber) updateData.phoneNumber = phoneNumber;
          if (streetNumber && !existingUser.streetNumber) updateData.streetNumber = streetNumber;
          if (streetName && !existingUser.streetName) updateData.streetName = streetName;
          if (city && !existingUser.city) updateData.city = city;
          if (postalCode && !existingUser.postalCode) updateData.postalCode = postalCode;
          if (tagNumber && !existingUser.tagNumber) updateData.tagNumber = tagNumber;

          if (Object.keys(updateData).length > 0) {
            await tx.user.update({
              where: { id: existingUser.id },
              data: updateData
            });
          }

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
                paymentNotes: paymentNotes || null,
                paymentRecordedAt: paymentRecordedAt,
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
              streetNumber,
              streetName,
              city,
              postalCode,
              tagNumber,
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
                  paymentNotes: paymentNotes || null,
                  paymentRecordedAt: paymentRecordedAt,
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
