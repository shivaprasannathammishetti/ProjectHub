const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists by googleId
    let user = await User.findOne({ googleId: profile.id });

    if (user) return done(null, user);

    // Check if email already registered (normal account)
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.avatar   = profile.photos?.[0]?.value;
        user.isVerified = true; // Google accounts are pre-verified
        await user.save();
        return done(null, user);
      }
    }

    // Create new user via Google
    user = await User.create({
      name:       profile.displayName,
      email:      email,
      googleId:   profile.id,
      avatar:     profile.photos?.[0]?.value,
      isVerified: true  // Google accounts are pre-verified
    });

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;