const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');

describe('🔐 Auth API Tests', () => {

  // Clean users before each test
  beforeEach(async () => {
    await User.deleteMany({});
  });

  // ─── REGISTER ───────────────────────────────────
  describe('POST /api/auth/register', () => {

    test('✅ Should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@gmail.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain('verify');
    });

    test('❌ Should fail if fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@gmail.com' });

      expect(res.statusCode).toBe(500);
    });

    test('❌ Should fail if email already exists and verified', async () => {
      // Create verified user first
      await User.create({
        name: 'Existing User',
        email: 'exists@gmail.com',
        password: 'hashedpassword',
        isVerified: true
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'exists@gmail.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

  });

  // ─── LOGIN ──────────────────────────────────────
  describe('POST /api/auth/login', () => {

    test('✅ Should login successfully with correct credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('password123', 10);

      await User.create({
        name: 'Login User',
        email: 'login@gmail.com',
        password: hashed,
        isVerified: true
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@gmail.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('login@gmail.com');
    });

    test('❌ Should fail if email not found', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@gmail.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('No account found');
    });

    test('❌ Should fail if password is incorrect', async () => {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('correctpassword', 10);

      await User.create({
        name: 'Wrong Pass User',
        email: 'wrongpass@gmail.com',
        password: hashed,
        isVerified: true
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@gmail.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Incorrect password');
    });

    test('❌ Should fail if email not verified', async () => {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('password123', 10);

      await User.create({
        name: 'Unverified User',
        email: 'unverified@gmail.com',
        password: hashed,
        isVerified: false
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@gmail.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('verify');
    });

  });

  // ─── VERIFY EMAIL ────────────────────────────────
  describe('GET /api/auth/verify/:token', () => {

    test('✅ Should verify email with valid token', async () => {
      await User.create({
        name: 'Token User',
        email: 'token@gmail.com',
        password: 'hashedpassword',
        isVerified: false,
        verifyToken: 'validtoken123',
        verifyTokenExpiry: Date.now() + 3600000
      });

      const res = await request(app)
        .get('/api/auth/verify/validtoken123');

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('verified');
    });

    test('❌ Should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify/invalidtoken');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid');
    });

    test('❌ Should fail with expired token', async () => {
      await User.create({
        name: 'Expired Token User',
        email: 'expired@gmail.com',
        password: 'hashedpassword',
        isVerified: false,
        verifyToken: 'expiredtoken123',
        verifyTokenExpiry: Date.now() - 3600000 // expired 1 hour ago
      });

      const res = await request(app)
        .get('/api/auth/verify/expiredtoken123');

      expect(res.statusCode).toBe(400);
    });

  });

});