const nodemailer = require('nodemailer');

// ── Works with Gmail App Password ─────────────────
// Uses EMAIL_USER + EMAIL_PASS from .env
// Falls back gracefully if not set
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SENDER_EMAIL,
    pass: process.env.BREVO_API_KEY
  }
});

const FROM = `"${process.env.BREVO_SENDER_NAME || 'ProjectHub'}" <${process.env.BREVO_SENDER_EMAIL}>`;

// ── Send Verification Email ────────────────────────
async function sendVerificationEmail(to, name, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify.html?token=${token}`;

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden">
      <div style="background:#6366f1;padding:24px 32px">
        <h1 style="margin:0;color:#fff;font-size:20px">✅ Verify your email</h1>
      </div>
      <div style="padding:32px;color:#e2e8f0">
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 24px">
          Thanks for registering on <strong>ProjectHub</strong>. Click the button below to verify your email.
        </p>
        <a href="${verifyUrl}"
          style="display:inline-block;background:#6366f1;color:white;padding:14px 28px;
                 border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
          Verify Email
        </a>
        <p style="color:#475569;font-size:12px;margin-top:24px">
          This link expires in 24 hours. If you didn't register, ignore this email.
        </p>
        <p style="color:#475569;font-size:12px;margin:0">— ProjectHub Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({ from: FROM, to, subject: '✅ Verify your ProjectHub account', html });
  console.log(`[Email] Verification sent to ${to}`);
}

// ── Send Invite Email ──────────────────────────────
async function sendInviteEmail(to, toName, fromName, projectName) {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden">
      <div style="background:#6366f1;padding:24px 32px">
        <h1 style="margin:0;color:#fff;font-size:20px">🎉 You've been invited!</h1>
      </div>
      <div style="padding:32px;color:#e2e8f0">
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px">Hi <strong>${toName}</strong>,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 24px">
          <strong>${fromName}</strong> added you to project
          <strong style="color:#818cf8">${projectName}</strong> on ProjectHub.
        </p>
        <p style="color:#475569;font-size:12px;margin:0">— ProjectHub Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({ from: FROM, to, subject: `🎉 Invited to "${projectName}" on ProjectHub`, html });
  console.log(`[Email] Invite sent to ${to}`);
}

module.exports = { sendVerificationEmail, sendInviteEmail };