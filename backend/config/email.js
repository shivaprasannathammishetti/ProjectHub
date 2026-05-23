const https = require('https');

const sendEmail = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: { 
        name:  process.env.BREVO_SENDER_NAME, 
        email: process.env.BREVO_SENDER_EMAIL 
      },
      to: [{ email: to }],
      subject:     subject,
      htmlContent: html
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'accept':         'application/json',
        'api-key':        process.env.BREVO_API_KEY_HTTP,
        'content-type':   'application/json',
        'content-length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error('Brevo API error: ' + res.statusCode + ' ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ─── VERIFICATION EMAIL ──────────────────────────────
const sendVerificationEmail = async (email, name, token) => {
  const verifyURL = `${process.env.BACKEND_URL}/api/auth/verify/${token}`;
  try {
    await sendEmail(
      email,
      '✅ Verify Your ProjectHub Account',
      `<div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:#6366f1;padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:white">🗂 ProjectHub</h1>
          <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px">Team Project Management</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#e2e8f0;margin-bottom:8px">Hey ${name}! 👋</h2>
          <p style="color:#94a3b8;line-height:1.6;margin-bottom:24px">
            Thanks for registering on ProjectHub. Please verify your email address to activate your account.
          </p>
          <a href="${verifyURL}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">
            ✅ Verify My Email
          </a>
          <p style="color:#475569;font-size:13px;margin-top:24px">
            This link expires in <strong style="color:#f87171">24 hours</strong>.<br/>
            If you didn't register, ignore this email.
          </p>
        </div>
        <div style="background:#1e293b;padding:16px;text-align:center">
          <p style="color:#475569;font-size:12px;margin:0">
            © 2026 ProjectHub — CodeAlpha Internship Project
          </p>
        </div>
      </div>`
    );
    console.log('Verification email sent to ' + email);
  } catch (err) {
    console.error('Failed to send verification email: ' + err.message);
  }
};

// ─── INVITE EMAIL ────────────────────────────────────
const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  try {
    await sendEmail(
      toEmail,
      `🚀 ${inviterName} invited you to "${projectName}" on ProjectHub`,
      `<div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:white">🗂 ProjectHub</h1>
          <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px">Team Project Management</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#e2e8f0;margin:0 0 8px">Hey ${toName}! 👋</h2>
          <p style="color:#94a3b8;line-height:1.6;margin-bottom:28px">
            <strong style="color:#e2e8f0">${inviterName}</strong> has invited you to collaborate on a project.
          </p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin-bottom:28px">
            <p style="margin:0 0 4px;color:#f1f5f9;font-size:17px;font-weight:600">🚀 ${projectName}</p>
            <p style="margin:0;color:#64748b;font-size:13px">You've been added as a member</p>
          </div>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
              Open ProjectHub →
            </a>
          </div>
          <p style="color:#475569;font-size:12px;text-align:center;margin:0">
            If you weren't expecting this, you can safely ignore this email.
          </p>
        </div>
        <div style="background:#1e293b;padding:16px;text-align:center">
          <p style="color:#475569;font-size:12px;margin:0">
            © 2026 ProjectHub — CodeAlpha Internship Project
          </p>
        </div>
      </div>`
    );
    console.log('Invite email sent to ' + toEmail);
  } catch (err) {
    console.error('Failed to send invite email: ' + err.message);
  }
};

module.exports = { sendVerificationEmail, sendInviteEmail };