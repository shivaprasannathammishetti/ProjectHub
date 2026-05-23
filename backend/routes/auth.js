const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User     = require('../models/User');
const { sendVerificationEmail } = require('../config/email');

// ─── GOOGLE OAUTH STRATEGY ───────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL   // ← reads from .env, not hardcoded
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email  = profile.emails[0].value;
    const name   = profile.displayName;
    const avatar = profile.photos[0]?.value;

    // Check if user already exists by googleId
    let user = await User.findOne({ googleId: profile.id });
    if (user) return done(null, user);

    // Check if user exists by email (registered normally before)
    user = await User.findOne({ email });
    if (user) {
      // Link Google to existing account
      user.googleId   = profile.id;
      user.avatar     = avatar;
      user.isVerified = true;
      await user.save();
      return done(null, user);
    }

    // Create brand new Google user
    user = await User.create({
      name,
      email,
      googleId:   profile.id,
      avatar,
      isVerified: true
    });

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try   { done(null, await User.findById(id)); }
  catch (err) { done(err, null); }
});

// ─── GOOGLE AUTH — Step 1: redirect to Google ────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ─── GOOGLE AUTH — Step 2: callback from Google ──────
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/index.html?error=google_failed`
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const user  = {
      id:     req.user._id,
      name:   req.user.name,
      email:  req.user.email,
      avatar: req.user.avatar || null
    };
    res.redirect(
      `${process.env.FRONTEND_URL}/index.html?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
    );
  }
);

// ─── REGISTER ───────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      if (!exists.isVerified) {
        const token = crypto.randomBytes(32).toString('hex');
        exists.verifyToken       = token;
        exists.verifyTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
        await exists.save();
        await sendVerificationEmail(email, exists.name, token);
        return res.status(400).json({
          message: 'Account exists but not verified. Verification email resent!'
        });
      }
      return res.status(400).json({ message: 'User already exists with this email!' });
    }

    const hashed            = await bcrypt.hash(password, 10);
    const verifyToken       = crypto.randomBytes(32).toString('hex');
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
// ─── VERIFY EMAIL ───────────────────────────────────
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verifyToken:       req.params.token,
      verifyTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      // Redirect to frontend with error
      return res.redirect(
        `${process.env.FRONTEND_URL}/index.html?verified=false`
      );
    }

    user.isVerified        = true;
    user.verifyToken       = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    // Redirect to frontend with success
    res.redirect(
      `${process.env.FRONTEND_URL}/index.html?verified=true`
    );

  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/index.html?verified=false`);
  }
});

// ─── LOGIN ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No account found with this email!' });

    // Google-only account — no password set
    if (!user.password) {
      return res.status(400).json({
        message: '⚠️ This account uses Google Sign-In. Please click "Continue with Google".'
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
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || null }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;