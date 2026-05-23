const https = require('https');

const sendEmail = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME, email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html
    });
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY_HTTP,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error('Brevo API error: ' + res.statusCode + ' ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const sendVerificationEmail = async (email, name, token) => {
  const verifyURL = process.env.BACKEND_URL + '/api/auth/verify/' + token;
  try {
    await sendEmail(
      email,
      'Verify your ProjectHub account',
      '<div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px"><h2 style="color:#6366f1">Welcome, ' + name + '!</h2><p style="color:#94a3b8">Please verify your email to activate your ProjectHub account.</p><a href="' + verifyURL + '" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Verify My Email</a><p style="color:#475569;font-size:12px;margin-top:24px">This link expires in 24 hours.</p></div>'
    );
    console.log('Verification email sent to ' + email);
  } catch (err) {
    console.error('Failed to send verification email: ' + err.message);
  }
};

const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  try {
    await sendEmail(
      toEmail,
      'You have been invited to ' + projectName + ' on ProjectHub',
      '<div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px"><h2 style="color:#6366f1">You are invited!</h2><p style="color:#94a3b8">' + inviterName + ' has invited you to join ' + projectName + '.</p><a href="' + process.env.FRONTEND_URL + '" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Open ProjectHub</a></div>'
    );
    console.log('Invite email sent to ' + toEmail);
  } catch (err) {
    console.error('Failed to send invite email: ' + err.message);
  }
};

module.exports = { sendVerificationEmail, sendInviteEmail };