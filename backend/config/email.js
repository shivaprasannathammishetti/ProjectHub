const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,          // false = STARTTLS (works on Render free tier)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false   // prevents TLS cert errors on Render
  }
});

// ─── VERIFICATION EMAIL ──────────────────────────────
const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify.html?token=${token}`;

  await transporter.sendMail({
    from:    `"ProjectHub" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: '✅ Verify Your ProjectHub Account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#6366f1;padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:28px;color:white;">🗂 ProjectHub</h1>
          <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Team Project Management</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#e2e8f0;margin-bottom:8px;">Hey ${name}! 👋</h2>
          <p style="color:#94a3b8;line-height:1.6;margin-bottom:24px;">
            Thanks for registering on ProjectHub. Please verify your email address to activate your account.
          </p>
          <a href="${verifyUrl}" style="
            display:inline-block;background:#6366f1;color:white;
            padding:14px 32px;border-radius:10px;text-decoration:none;
            font-weight:600;font-size:15px;margin-bottom:24px;">
            ✅ Verify My Email
          </a>
          <p style="color:#475569;font-size:13px;margin-top:24px;">
            This link expires in <strong style="color:#f87171">24 hours</strong>.<br/>
            If you didn't register, ignore this email.
          </p>
        </div>
        <div style="background:#1e293b;padding:16px;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 ProjectHub — CodeAlpha Internship Project</p>
        </div>
      </div>
    `
  });
};

// ─── INVITE EMAIL ────────────────────────────────────
const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  await transporter.sendMail({
    from:    `"ProjectHub" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `🚀 ${inviterName} invited you to "${projectName}" on ProjectHub`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:28px;color:white;">🗂 ProjectHub</h1>
          <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Team Project Management</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#e2e8f0;margin:0 0 8px;">Hey ${toName}! 👋</h2>
          <p style="color:#94a3b8;line-height:1.6;margin-bottom:28px;">
            <strong style="color:#e2e8f0;">${inviterName}</strong> has invited you to collaborate on a project.
            You have been added as a member and can now view tasks, track progress, and work together in real time!
          </p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 4px;color:#f1f5f9;font-size:17px;font-weight:600;">🚀 ${projectName}</p>
            <p style="margin:0;color:#64748b;font-size:13px;">You have been added as a member</p>
          </div>
          <p style="color:#64748b;font-size:12px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">What you can do now</p>
          <div style="margin-bottom:28px;">
            <div style="background:#1e293b;border-radius:8px;padding:10px 16px;margin-bottom:8px;color:#94a3b8;font-size:14px;">✅  View and manage tasks on the Kanban board</div>
            <div style="background:#1e293b;border-radius:8px;padding:10px 16px;margin-bottom:8px;color:#94a3b8;font-size:14px;">📊  Track project progress in real time</div>
            <div style="background:#1e293b;border-radius:8px;padding:10px 16px;color:#94a3b8;font-size:14px;">💬  Add comments and get assigned to tasks</div>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${process.env.FRONTEND_URL}" style="
              display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
              color:white;padding:14px 40px;border-radius:10px;
              text-decoration:none;font-weight:600;font-size:15px;">
              Open ProjectHub →
            </a>
          </div>
          <p style="color:#475569;font-size:12px;text-align:center;margin:0;">
            If you were not expecting this, you can safely ignore this email.
          </p>
        </div>
        <div style="background:#1e293b;padding:16px;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 ProjectHub — CodeAlpha Internship Project</p>
        </div>
      </div>
    `
  });
};

module.exports = { sendVerificationEmail, sendInviteEmail };