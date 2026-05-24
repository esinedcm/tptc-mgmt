import nodemailer from 'nodemailer';
import fs from 'fs';

async function run() {
  const envFile = fs.readFileSync('.env', 'utf-8');
  let user = '';
  let pass = '';
  
  for (const line of envFile.split('\n')) {
    if (line.startsWith('SMTP_USER=')) user = line.split('=')[1].replace(/"/g, '').trim();
    if (line.startsWith('SMTP_PASS=')) pass = line.split('=')[1].replace(/"/g, '').trim();
  }

  console.log("USER:", user);
  // Do not log password, but show length
  console.log("PASS length:", pass.length);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: user,
      to: user,
      subject: "Test Email via Nodemailer",
      text: "Hello world"
    });
    console.log("Success:", info.messageId);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
