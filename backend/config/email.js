// Email disabled for production — auto-verify users
const sendVerificationEmail = async (email, name, token) => {
  console.log(`Verification skipped for ${email}`);
};

const sendInviteEmail = async (toEmail, toName, inviterName, projectName) => {
  console.log(`Invite email skipped for ${toEmail}`);
};

module.exports = { sendVerificationEmail, sendInviteEmail };