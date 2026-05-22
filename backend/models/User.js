const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true },
  password:          { type: String, required: false }, // optional for Google OAuth users
  googleId:          { type: String },                  // Google OAuth ID
  avatar:            { type: String },                  // Google profile picture
  isVerified:        { type: Boolean, default: false },
  verifyToken:       { type: String },
  verifyTokenExpiry: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);