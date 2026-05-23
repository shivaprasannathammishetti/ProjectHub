const nodemailer = require('nodemailer');

// ── Brevo SMTP Transporter ─────────────────────────────
// BREVO_SMTP_LOGIN  = ab46d6001@smtp-brevo.com  (SMTP login)
// BREVO_API_KEY     = your SMTP key             (SMTP password)
// BREVO_SENDER_EMAIL= shivaprasannathammishetti@gmail.com (verified sender)
// BREVO_SENDER_NAME = ProjectHub
const transporter = nodemailer.createTransport({
  host:   'smtp-relay.brevo.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,  // ab46d6001@smtp-brevo.com
    pass: process.env.BREVO_API_KEY      // SMTP key ending in NC3IiG
  }
});

// ── Verify connection on startup ───────────────────────
transporter.verify((err, success) => {
  if (err) console.error('❌ Brevo SMTP error:', err.message);
  else     console.log('✅ Brevo SMTP ready');
});

// ── Send Verification Email ────────────────────────────
const sendVerificationEmail = async (email, name, token) => {
  const verifyURL = `${process.env.BACKEND_URL}/api/auth/verify/${token}`;
  try {
    await transporter.sendMail({
      from:    `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to:      email,
      subject: 'Verify your ProjectHub account',
      html: `
        <div style="
          font-family: Inter, sans-serif;
          max-width: 480px;
          margin: auto;
          padding: 32px;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 12px;
        ">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:32px">🗂️</span>
            <h1 style="color:#6366f1;margin:8px 0 0">ProjectHub</h1>
          </div>

          <h2 style="color:#e2e8f0;margin-bottom:8px">
            👋 Welcome, ${name}!
          </h2>
          <p style="color:#94a3b8;margin-bottom:24px;line-height:1.6">
            Thanks for signing up! Please verify your email address to activate
            your ProjectHub account.
          </p>

          <div style="text-align:center;margin:32px 0">
            <a href="${verifyURL}"
              style="
                display: inline-block;
                background: #6366f1;
                color: white;
                padding: 14px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                letter-spacing: 0.3px;
              ">
              ✅ Verify My Email
            </a>
          </div>

          <p style="color:#475569;font-size:12px;margin-top:24px;text-align:center">
            This link expires in <strong>24 hours</strong>.<br/>
            If you didn't create an account, you can safely ignore this email.
          </p>

          <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0"/>
          <p style="color:#334155;font-size:11px;text-align:center">
            ProjectHub — CodeAlpha Internship Project
          </p>
        </div>
      `
    });
    console.log(`✅ Verification email sent to ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send verification email to ${email}:`, err.message);
  }
};

// ── Send Invite Email ──────────────────────────────────
const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  try {
    await transporter.sendMail({
      from:    `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to:      toEmail,
      subject: `You've been invited to "${projectName}" on ProjectHub`,
      html: `
        <div style="
          font-family: Inter, sans-serif;
          max-width: 480px;
          margin: auto;
          padding: 32px;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 12px;
        ">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:32px">🗂️</span>
            <h1 style="color:#6366f1;margin:8px 0 0">ProjectHub</h1>
          </div>

          <h2 style="color:#e2e8f0;margin-bottom:8px">🎉 You're invited!</h2>
          <p style="color:#94a3b8;margin-bottom:8px;line-height:1.6">
            <strong style="color:#e2e8f0">${inviterName}</strong> has invited you
            to join the project:
          </p>
          <div style="
            background:#1e293b;
            border-left:4px solid #6366f1;
            padding:12px 16px;
            border-radius:6px;
            margin-bottom:24px;
          ">
            <span style="color:#e2e8f0;font-weight:600;font-size:16px">
              📁 ${projectName}
            </span>
          </div>

          <div style="text-align:center;margin:32px 0">
            <a href="${process.env.FRONTEND_URL}"
              style="
                display: inline-block;
                background: #6366f1;
                color: white;
                padding: 14px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
              ">
              🚀 Open ProjectHub
            </a>
          </div>

          <p style="color:#475569;font-size:12px;text-align:center">
            Login or register with this email address to access the project.
          </p>

          <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0"/>
          <p style="color:#334155;font-size:11px;text-align:center">
            ProjectHub — CodeAlpha Internship Project
          </p>
        </div>
      `
    });
    console.log(`✅ Invite email sent to ${toEmail}`);
  } catch (err) {
    console.error(`❌ Failed to send invite email to ${toEmail}:`, err.message);
  }
};

module.exports = { sendVerificationEmail, sendInviteEmail };