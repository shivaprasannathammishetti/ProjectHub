const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_API_KEY
  }
});

const sendVerificationEmail = async (email, name, token) => {
  const verifyURL = `${process.env.BACKEND_URL}/api/auth/verify/${token}`;
  await transporter.sendMail({
    from: `"ProjectHub" <${process.env.BREVO_SENDER_EMAIL}>`,
    to: email,
    subject: '✅ Verify Your ProjectHub Account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
        <h2 style="color:#6366f1">Welcome, ${name}! 👋</h2>
        <p style="color:#94a3b8">Please verify your email to activate your ProjectHub account.</p>
        <a href="${verifyURL}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">✅ Verify My Email</a>
        <p style="color:#475569;font-size:12px;margin-top:24px">This link expires in 24 hours.</p>
      </div>
    `
  });
};

const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  await transporter.sendMail({
    from: `"ProjectHub" <${process.env.BREVO_SENDER_EMAIL}>`,
    to: toEmail,
    subject: `🚀 ${inviterName} invited you to "${projectName}" on ProjectHub`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
        <h2 style="color:#6366f1">You're invited! 🎉</h2>
        <p style="color:#94a3b8"><strong style="color:#e2e8f0">${inviterName}</strong> invited you to join <strong style="color:#e2e8f0">${projectName}</strong>.</p>
        <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Open ProjectHub →</a>
      </div>
    `
  });
};

module.exports = { sendVerificationEmail, sendInviteEmail };