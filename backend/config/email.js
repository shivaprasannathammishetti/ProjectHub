const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_API_KEY
  }
});

transporter.verify((err, success) => {
  if (err) console.error('Brevo SMTP error:', err.message);
  else console.log('Brevo SMTP ready');
});

const sendVerificationEmail = async (email, name, token) => {
  const verifyURL = process.env.BACKEND_URL + '/api/auth/verify/' + token;
  try {
    await transporter.sendMail({
      from: '"' + process.env.BREVO_SENDER_NAME + '" <' + process.env.BREVO_SENDER_EMAIL + '>',
      to: email,
      subject: 'Verify your ProjectHub account',
      html: '<div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px"><h2 style="color:#6366f1">Welcome, ' + name + '!</h2><p style="color:#94a3b8">Please verify your email to activate your ProjectHub account.</p><a href="' + verifyURL + '" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Verify My Email</a><p style="color:#475569;font-size:12px;margin-top:24px">This link expires in 24 hours.</p></div>'
    });
    console.log('Verification email sent to ' + email);
  } catch (err) {
    console.error('Failed to send verification email: ' + err.message);
  }
};

const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  try {
    await transporter.sendMail({
      from: '"' + process.env.BREVO_SENDER_NAME + '" <' + process.env.BREVO_SENDER_EMAIL + '>',
      to: toEmail,
      subject: 'You have been invited to ' + projectName + ' on ProjectHub',
      html: '<div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px"><h2 style="color:#6366f1">You are invited!</h2><p style="color:#94a3b8">' + inviterName + ' has invited you to join ' + projectName + '.</p><a href="' + process.env.FRONTEND_URL + '" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Open ProjectHub</a></div>'
    });
    console.log('Invite email sent to ' + toEmail);
  } catch (err) {
    console.error('Failed to send invite email: ' + err.message);
  }
};

module.exports = { sendVerificationEmail, sendInviteEmail };