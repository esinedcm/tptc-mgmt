import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (!transporter) {
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
  return transporter;
}

export async function sendEditLinkEmail(recipientEmail: string, editToken: string) {
  const mailer = await getTransporter();

  const editUrl = `http://localhost:3000/register?editToken=${editToken}`;

  const info = await mailer.sendMail({
    from: '"Tennis Club Admin" <admin@tennisclub.local>',
    to: recipientEmail,
    subject: "Your Registration Details & Edit Link",
    text: `Thank you for registering! You can edit your household registration at any time using this link: ${editUrl}`,
    html: `<b>Thank you for registering!</b><br><p>You can edit your household registration at any time using this link:</p><p><a href="${editUrl}">${editUrl}</a></p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("==========================================");
  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", previewUrl);
  console.log("==========================================");
  
  return previewUrl;
}

export async function sendProfileUpdatedEmail(recipientEmail: string, changes: { field: string, oldVal: string, newVal: string }[]) {
  const mailer = await getTransporter();

  const changesHtml = changes.map(c => `<li><b>${c.field}</b>: ${c.oldVal || '(empty)'} &rarr; ${c.newVal || '(empty)'}</li>`).join('');
  const changesText = changes.map(c => `- ${c.field}: ${c.oldVal || '(empty)'} -> ${c.newVal || '(empty)'}`).join('\n');

  const info = await mailer.sendMail({
    from: '"Tennis Club Admin" <admin@tennisclub.local>',
    to: recipientEmail,
    subject: "Your Club Registration Details Were Updated",
    text: `Your registration details were recently updated by an administrator. Here are the changes:\n\n${changesText}`,
    html: `<b>Your registration details were recently updated by an administrator.</b><br><br><p>Here are the changes:</p><ul>${changesHtml}</ul>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("==========================================");
  console.log("Update Message sent: %s", info.messageId);
  console.log("Preview URL: %s", previewUrl);
  console.log("==========================================");
  
  return previewUrl;
}
