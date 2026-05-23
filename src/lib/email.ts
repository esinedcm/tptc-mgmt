import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

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
      from: `"Tennis Club Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
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

export async function sendWelcomeEmail({
  to,
  firstName,
  memberNumber,
}: {
  to: string;
  firstName: string;
  memberNumber?: string | null;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginLink = `${baseUrl}/login`;

  const memberNumberText = memberNumber ? `<p>Your official Member Number is: <strong>${memberNumber}</strong></p>` : '';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Welcome to the Tennis Club!</h2>
      <p>Hi ${firstName},</p>
      <p>Great news! Your club membership has been approved and activated.</p>
      ${memberNumberText}
      <p>You can now log into the Member Portal to view your status, update your contact details, and (coming soon) book tennis courts!</p>
      <a href="${loginLink}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Member Portal</a>
      <p>If you haven't set a password yet, simply click the "Forgot your password?" link on the login page.</p>
      <p>See you on the courts!</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to the Tennis Club! Your account is active.',
    html
  });
}

export async function sendEditLinkEmail(recipientEmail: string, editToken: string) {
  const mailer = await getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const editUrl = `${baseUrl}/register?editToken=${editToken}`;

  const info = await mailer.sendMail({
    from: `"Tennis Club Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
    to: recipientEmail,
    subject: "Your Registration Details & Edit Link",
    text: `Thank you for registering! You can edit your household registration at any time using this link: ${editUrl}`,
    html: `<b>Thank you for registering!</b><br><p>You can edit your household registration at any time using this link:</p><p><a href="${editUrl}">${editUrl}</a></p>`,
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

  const info = await mailer.sendMail({
    from: `"Tennis Club Admin" <${process.env.SMTP_USER || 'admin@tennisclub.local'}>`,
    to: recipientEmail,
    subject: "Your Club Registration Details Were Updated",
    text: `Your registration details were recently updated by an administrator. Here are the changes:\n\n${changesText}`,
    html: `<b>Your registration details were recently updated by an administrator.</b><br><br><p>Here are the changes:</p><ul>${changesHtml}</ul>`,
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
    participantNames: string[];
  }
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const portalLink = `${baseUrl}/portal/book`;

  const { action, courtName, startTime, endTime, type, participantNames } = bookingDetails;
  
  const formattedStart = startTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const formattedEnd = endTime.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  let actionText = '';
  if (action === 'created') actionText = 'A new court booking has been made.';
  if (action === 'updated') actionText = 'An existing court booking has been updated.';
  if (action === 'cancelled') actionText = 'A court booking has been CANCELLED.';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Court Booking ${action === 'cancelled' ? 'Cancelled' : (action === 'created' ? 'Confirmed' : 'Updated')}</h2>
      <p>${actionText}</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedStart} to ${formattedEnd}</p>
        <p style="margin: 5px 0;"><strong>Type:</strong> ${type}</p>
        <p style="margin: 5px 0;"><strong>Players:</strong> ${participantNames.join(', ')}</p>
      </div>
      ${action !== 'cancelled' ? `<p><a href="${portalLink}" style="color: #4f46e5;">Manage your bookings in the Member Portal</a></p>` : ''}
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html
  });
}
