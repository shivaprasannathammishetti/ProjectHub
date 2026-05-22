const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const passport = require('passport');
const User     = require('../models/User');
const { sendVerificationEmail } = require('../config/email');

// ─── REGISTER ───────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      if (!exists.isVerified) {
        const token = crypto.randomBytes(32).toString('hex');
        exists.verifyToken = token;
        exists.verifyTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
        await exists.save();
        await sendVerificationEmail(email, exists.name, token);
        return res.status(400).json({
          message: 'Account exists but not verified. Verification email resent!'
        });
      }
      return res.status(400).json({ message: 'User already exists with this email!' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    await User.create({ name, email, password: hashed, verifyToken, verifyTokenExpiry });
    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({
      message: '✅ Registration successful! Please check your email to verify your account.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ─── VERIFY EMAIL ───────────────────────────────────
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verifyToken: req.params.token,
      verifyTokenExpiry: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired verification link.' });

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    res.json({ message: '✅ Email verified successfully! You can now login.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ─── LOGIN ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No account found with this email!' });

    // Block Google-only users from password login
    if (!user.password) {
      return res.status(400).json({
        message: '⚠️ This account uses Google Sign-In. Please click "Login with Google".'
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: '⚠️ Please verify your email first! Check your inbox.'
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Incorrect password!' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });

  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ─── GOOGLE OAUTH — Step 1: Redirect to Google ──────
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'   // always show account picker
  })
);

// ─── GOOGLE OAUTH — Step 2: Google Callback ─────────
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/?error=google_failed' }),
  (req, res) => {
    try {
      // Generate JWT for the Google-authenticated user
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      const user = {
        id:    req.user._id,
        name:  req.user.name,
        email: req.user.email
      };

      // Redirect to frontend with token & user info in URL
      const userStr = encodeURIComponent(JSON.stringify(user));
      res.redirect(
        `http://127.0.0.1:5500/frontend/index.html?token=${token}&user=${userStr}`
      );
    } catch (err) {
      res.redirect('/?error=server_error');
    }
  }
);

module.exports = router;