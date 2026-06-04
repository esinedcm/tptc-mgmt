import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

let transporter: nodemailer.Transporter | null = null;

export const getBaseUrl = async () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const isDev = process.env.NODE_ENV !== 'production';
    const protocol = headersList.get('x-forwarded-proto') || (isDev || host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (e) {
    // headers() might throw if called outside a request context
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

async function getTransporter() {
  if (!transporter) {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use real SMTP (e.g. Gmail) if credentials are provided
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS, // App Password
        },
      });
    } else {
      // Fallback to ethereal for local dev without credentials
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
  }
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: `"${process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || 'Club'} Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
      to,
      subject,
      html,
    });
    
    console.log("==========================================");
    console.log('Message sent: %s', info.messageId);
    if (!process.env.SMTP_USER) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    console.log("==========================================");
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

async function fetchTemplate(id: string, defaultSubject: string, defaultHtml: string, variables: Record<string, string>) {
  let subject = defaultSubject;
  let html = defaultHtml;
  try {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (template) {
      subject = template.subject;
      html = template.htmlBody;
    }
  } catch (err) {
    console.error(`Error fetching email template ${id}:`, err);
  }

  for (const [key, value] of Object.entries(variables)) {
    // Replace all occurrences of {{key}}
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
  }

  return { subject, html };
}

export async function sendWelcomeEmail({
  to,
  firstName,
  memberNumber,
}: {
  to: string;
  firstName: string;
  memberNumber?: string | null;
}) {
  const baseUrl = await getBaseUrl();
  const loginLink = `${baseUrl}/login?email=${encodeURIComponent(to)}`;

  const memberNumberText = memberNumber ? `<p>Your official Member Number is: <strong>${memberNumber}</strong></p>` : '';

  const defaultHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Welcome to the {{clubName}}!</h2>
      <p>Hi {{firstName}},</p>
      <p>Great news! Your club membership has been approved and activated.</p>
      ${memberNumberText}
      <p>You can now log into the Member Portal to view your status, update your contact details, and book tennis courts!</p>
      <a href="{{loginLink}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Member Portal</a>
      <p>If you haven't set a password yet, simply click the "Forgot your password?" link on the login page.</p>
      <p>See you on the courts!</p>
    </div>
  `;

  const defaultSubject = `Welcome to the {{clubName}}! Your account is active.`;

  const { subject, html } = await fetchTemplate('WELCOME_EMAIL', defaultSubject, defaultHtml, {
    firstName,
    memberNumber: memberNumber || '',
    clubName: process.env.NEXT_PUBLIC_CLUB_NAME || 'Tennis Club',
    loginLink,
  });

  return sendEmail({
    to,
    subject,
    html
  });
}

export async function sendEditLinkEmail(recipientEmail: string, editToken: string, memberNames: string[] = [], totalDue: number = 0) {
  const mailer = await getTransporter();
  const baseUrl = await getBaseUrl();
  const editUrl = `${baseUrl}/register?editToken=${editToken}`;

  const paymentEmail = process.env.NEXT_PUBLIC_PAYMENT_EMAIL || 'admin@tennisclub.local';
  
  const defaultHtml = `<b>Thank you for registering!</b><br><p>Your registration is now pending approval. Here are your registration details:</p><ul><li><b>Registered Members:</b> {{memberNames}}</li><li><b>Total Amount Due:</b> $\{{totalDue}}</li></ul><p>Send your membership payment (ensure you include your first and last name in the message) via Etransfer to <strong>{{paymentEmail}}</strong>.<br/>
<strong>NOTE</strong>: Your membership is not complete until payment is received.  Once your membership registration and payment have been verified, you will receive an email with the lock code to the entrance gates along with other Club information including shoe tag arrangements.</p><p>You can edit your household registration at any time using this link:</p><p><a href="{{editUrl}}">{{editUrl}}</a></p>`;

  const defaultSubject = "Your Registration Details & Edit Link";
  const defaultText = `Thank you for registering! Your registration ({{memberNames}}) is now pending approval. Your total amount due is $\{{totalDue}}.  Send your membership payment (ensure you include your first and last name in the message) via Etransfer to {{paymentEmail}}.
 Your membership is not complete until payment is received.  Once your membership registration and payment have been verified, you will receive an email with the lock code to the entrance gates along with other Club information including shoe tag arrangements. You can edit your household registration at any time using this link: {{editUrl}}`;

  const { subject, html } = await fetchTemplate('REGISTRATION_PENDING', defaultSubject, defaultHtml, {
    memberNames: memberNames.join(', '),
    totalDue: totalDue.toString(),
    paymentEmail,
    editUrl,
  });

  // Also replace variables in plain text for fallback
  let text = defaultText;
  for (const [key, value] of Object.entries({ memberNames: memberNames.join(', '), totalDue: totalDue.toString(), paymentEmail, editUrl })) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    text = text.replace(regex, value);
  }

  const info = await mailer.sendMail({
    from: `"${process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || 'Club'} Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
    to: recipientEmail,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("==========================================");
  console.log("Message sent: %s", info.messageId);
  if (!process.env.SMTP_USER && previewUrl) {
    console.log("Preview URL: %s", previewUrl);
  }
  console.log("==========================================");
  
  return previewUrl;
}

export async function sendProfileUpdatedEmail(recipientEmail: string, changes: { field: string, oldVal: string, newVal: string }[]) {
  const mailer = await getTransporter();

  const changesHtml = changes.map(c => `<li><b>${c.field}</b>: ${c.oldVal || '(empty)'} &rarr; ${c.newVal || '(empty)'}</li>`).join('');
  const changesText = changes.map(c => `- ${c.field}: ${c.oldVal || '(empty)'} -> ${c.newVal || '(empty)'}`).join('\n');

  const defaultHtml = `<b>Your registration details were recently updated by an administrator.</b><br><br><p>Here are the changes:</p><ul>{{changesHtml}}</ul>`;
  const defaultSubject = "Your Club Registration Details Were Updated";
  const defaultText = `Your registration details were recently updated by an administrator. Here are the changes:\n\n{{changesText}}`;

  const { subject, html } = await fetchTemplate('PROFILE_UPDATED', defaultSubject, defaultHtml, {
    changesHtml
  });
  
  const text = defaultText.replace(/{{changesText}}/g, changesText);

  const info = await mailer.sendMail({
    from: `"${process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || 'Club'} Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
    to: recipientEmail,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("==========================================");
  console.log("Update Message sent: %s", info.messageId);
  if (!process.env.SMTP_USER && previewUrl) {
    console.log("Preview URL: %s", previewUrl);
  }
  console.log("==========================================");
  
  return previewUrl;
}

export async function sendBookingEmail({
  to,
  subject,
  bookingDetails,
}: {
  to: string;
  subject: string;
  bookingDetails: {
    action: 'created' | 'updated' | 'cancelled';
    courtName: string;
    startTime: Date;
    endTime: Date;
    type: string;
    title?: string | null;
    description?: string | null;
    participantNames: string[];
    bookedBy: string;
    bookedAt: Date;
  }
}) {
  const baseUrl = await getBaseUrl();
  const portalLink = `${baseUrl}/portal/book`;

  const { action, courtName, startTime, endTime, type, title, description, participantNames, bookedBy, bookedAt } = bookingDetails;
  
  const formattedStart = startTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const formattedEnd = endTime.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formattedBookedAt = bookedAt.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  
  let actionText = '';
  if (action === 'created') actionText = 'A new court booking has been made.';
  if (action === 'updated') actionText = 'An existing court booking has been updated.';
  if (action === 'cancelled') actionText = 'A court booking has been CANCELLED.';

  const defaultHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Court Booking {{actionTitle}}</h2>
      <p>{{actionText}}</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Court:</strong> {{courtName}}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> {{formattedStart}} to {{formattedEnd}}</p>
        <p style="margin: 5px 0;"><strong>Type:</strong> {{type}}</p>
        ${title ? `<p style="margin: 5px 0;"><strong>Event Title:</strong> {{title}}</p>` : ''}
        ${description ? `<p style="margin: 5px 0;"><strong>Event Details:</strong> {{description}}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Players:</strong> {{participantNames}}</p>
        <p style="margin: 5px 0; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;"><strong>Booked By:</strong> {{bookedBy}} on {{formattedBookedAt}}</p>
      </div>
      ${action !== 'cancelled' ? `<p><a href="{{portalLink}}" style="color: #4f46e5;">Manage your bookings in the Member Portal</a></p>` : ''}
    </div>
  `;

  const defaultSubject = subject;

  const resolved = await fetchTemplate('BOOKING_CONFIRMATION', defaultSubject, defaultHtml, {
    actionTitle: action === 'cancelled' ? 'Cancelled' : (action === 'created' ? 'Confirmed' : 'Updated'),
    actionText,
    courtName,
    formattedStart,
    formattedEnd,
    type,
    title: title || '',
    description: description || '',
    participantNames: participantNames.join(', '),
    bookedBy,
    formattedBookedAt,
    portalLink,
  });

  return sendEmail({
    to,
    subject: resolved.subject,
    html: resolved.html
  });
}

export async function sendInterestConfirmationEmail({
  to,
  firstName,
  leadId,
}: {
  to: string;
  firstName: string;
  leadId: string;
}) {
  const baseUrl = await getBaseUrl();
  const registerLink = `${baseUrl}/register?leadId=${leadId}`;

  const defaultHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Thanks for your interest in {{clubName}}!</h2>
      <p>Hi {{firstName}},</p>
      <p>We've received your information and are thrilled you're interested in joining our Club.</p>
      <p>We hope you make {{clubShortName}} your home this season, and together we will continue to build upon a great tradition of excellence.</p>
      <p>If you're ready to take the next step and officially register your household, you can do so at any time using the link below:</p>
      <a href="{{registerLink}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Register for the Club</a>
      <p>We look forward to seeing you on the courts!</p>
    </div>
  `;

  const defaultSubject = `Thanks for your interest in {{clubName}}!`;

  const { subject, html } = await fetchTemplate('INTEREST_CONFIRMATION', defaultSubject, defaultHtml, {
    firstName,
    clubName: process.env.NEXT_PUBLIC_CLUB_NAME || 'our Club',
    clubShortName: process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || 'our Club',
    registerLink,
  });

  return sendEmail({
    to,
    subject,
    html
  });
}

export async function sendAdminNewRegistrationEmail({
  to,
  memberNames,
  totalDue,
}: {
  to: string;
  memberNames: string[];
  totalDue: number;
}) {
  const baseUrl = await getBaseUrl();
  const adminDashboardLink = `${baseUrl}/admin`;

  const defaultHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">New Club Registration!</h2>
      <p>A new household has submitted a registration and is pending approval.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Registered Members:</strong> {{memberNames}}</p>
        <p style="margin: 5px 0;"><strong>Total Amount Due:</strong> $\{{totalDue}}</p>
      </div>
      <p>Please review the registration and payment status in the Admin Dashboard:</p>
      <a href="{{adminDashboardLink}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Admin Dashboard</a>
    </div>
  `;

  const defaultSubject = 'New Registration - Pending Approval';

  const { subject, html } = await fetchTemplate('ADMIN_NEW_REGISTRATION', defaultSubject, defaultHtml, {
    memberNames: memberNames.join(', '),
    totalDue: totalDue.toString(),
    adminDashboardLink,
  });

  return sendEmail({
    to,
    subject,
    html
  });
}

export async function sendRenewalLinkEmail(recipientEmail: string, resetToken: string) {
  const mailer = await getTransporter();
  const baseUrl = await getBaseUrl();
  const renewalUrl = `${baseUrl}/renew?token=${resetToken}`;

  const defaultHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Welcome Back to the Club!</h2>
      <p>It's time to renew your membership for the upcoming season!</p>
      <p>Click the secure link below to securely renew your membership without having to re-enter all your household details:</p>
      <a href="${renewalUrl}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Renew Membership</a>
      <p>If you didn't request this link, you can safely ignore this email.</p>
    </div>
  `;

  const defaultSubject = "Renew your Club Membership";
  const defaultText = `Welcome Back to the Club! It's time to renew your membership for the upcoming season! Click this link to securely renew your membership: ${renewalUrl}`;

  // Since we don't have a template set up for this yet in the DB, we just use the default.
  // We can add it to fetchTemplate if we want it customizable later.
  
  const info = await mailer.sendMail({
    from: `"${process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || 'Club'} Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
    to: recipientEmail,
    subject: defaultSubject,
    text: defaultText,
    html: defaultHtml,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("==========================================");
  console.log("Renewal Link sent: %s", info.messageId);
  if (!process.env.SMTP_USER && previewUrl) {
    console.log("Preview URL: %s", previewUrl);
  }
  console.log("==========================================");
  
  return previewUrl;
}

export async function sendImportWelcomeEmail({
  to,
  firstName,
  resetToken,
}: {
  to: string;
  firstName: string;
  resetToken: string;
}) {
  const mailer = await getTransporter();
  const baseUrl = await getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const defaultHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Welcome to the new {{clubName}} Portal!</h2>
      <p>Hi {{firstName}},</p>
      <p>We've recently upgraded our club management system! Your membership information has been successfully migrated to the new platform.</p>
      <p>To access your account, view your membership status, and book tennis courts, please click the link below to set up your new password:</p>
      <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up Your Password</a>
      <p>If you have any questions, please contact the club administrator.</p>
      <p>See you on the courts!</p>
    </div>
  `;

  const defaultSubject = `Welcome to the new {{clubName}} Portal!`;
  const defaultText = `Welcome to the new {{clubName}} Portal!\n\nHi {{firstName}},\n\nWe've recently upgraded our club management system! Your membership information has been successfully migrated to the new platform.\n\nTo access your account, view your membership status, and book tennis courts, please click the link below to set up your new password:\n\n{{resetUrl}}\n\nIf you have any questions, please contact the club administrator.\n\nSee you on the courts!`;

  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || 'Tennis Club';

  const { subject, html } = await fetchTemplate('IMPORT_WELCOME_EMAIL', defaultSubject, defaultHtml, {
    firstName,
    clubName,
    resetUrl,
  });

  // Handle default text replacements
  let text = defaultText;
  for (const [key, value] of Object.entries({ firstName, clubName, resetUrl })) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    text = text.replace(regex, value);
  }

  const info = await mailer.sendMail({
    from: `"${process.env.NEXT_PUBLIC_CLUB_SHORT_NAME || 'Club'} Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
    to,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("==========================================");
  console.log("Import Welcome sent: %s", info.messageId);
  if (!process.env.SMTP_USER && previewUrl) {
    console.log("Preview URL: %s", previewUrl);
  }
  console.log("==========================================");
  
  return previewUrl;
}
