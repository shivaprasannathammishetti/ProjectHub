const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let token;
let userId;

describe('📁 Project API Tests', () => {

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

    // Create and login a verified user
    const hashed = await bcrypt.hash('password123', 10);
    const user = await User.create({
      name: 'Project Tester',
      email: 'projecttest@gmail.com',
      password: hashed,
      isVerified: true
    });

    userId = user._id;
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  // ─── CREATE PROJECT ──────────────────────────────
  describe('POST /api/projects', () => {

    test('✅ Should create a new project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Project',
          description: 'Test Description'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Test Project');
      expect(res.body.owner).toBeDefined();
    });

    test('❌ Should fail without auth token', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: 'No Auth Project' });

      expect(res.statusCode).toBe(401);
    });

    test('❌ Should fail without project name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name project' });

      expect(res.statusCode).toBe(500);
    });

  });

  // ─── GET PROJECTS ────────────────────────────────
  describe('GET /api/projects', () => {

    test('✅ Should get all projects for logged in user', async () => {
      await Project.create({
        name: 'My Project',
        description: 'desc',
        owner: userId,
        members: [userId]
      });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('My Project');
    });

    test('✅ Should return empty array if no projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(0);
    });

    test('❌ Should fail without auth token', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toBe(401);
    });

  });

  // ─── DELETE PROJECT ──────────────────────────────
  describe('DELETE /api/projects/:id', () => {

    test('✅ Should delete a project', async () => {
      const project = await Project.create({
        name: 'Delete Me',
        owner: userId,
        members: [userId]
      });

      const res = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      const found = await Project.findById(project._id);
      expect(found).toBeNull();
    });

  });

  // ─── INVITE MEMBER ───────────────────────────────
  describe('POST /api/projects/:id/invite', () => {

    test('✅ Should invite a verified member', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      await User.create({
        name: 'Invite User',
        email: 'invite@gmail.com',
        password: hashed,
        isVerified: true
      });

      const project = await Project.create({
        name: 'Invite Project',
        owner: userId,
        members: [userId]
      });

      const res = await request(app)
        .post(`/api/projects/${project._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'invite@gmail.com' });

      expect(res.statusCode).toBe(200);
    });

    test('❌ Should fail if user not found', async () => {
      const project = await Project.create({
        name: 'Invite Project',
        owner: userId,
        members: [userId]
      });

      const res = await request(app)
        .post(`/api/projects/${project._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'notfound@gmail.com' });

      expect(res.statusCode).toBe(404);
    });

    test('❌ Should fail if user is not verified', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      await User.create({
        name: 'Unverified Invite',
        email: 'unverifiedinvite@gmail.com',
        password: hashed,
        isVerified: false
      });

      const project = await Project.create({
        name: 'Invite Project 2',
        owner: userId,
        members: [userId]
      });

      const res = await request(app)
        .post(`/api/projects/${project._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'unverifiedinvite@gmail.com' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('verified');
    });

  });

  // ─── PROGRESS ────────────────────────────────────
  describe('GET /api/projects/:id/progress', () => {

    test('✅ Should return project progress', async () => {
      const project = await Project.create({
        name: 'Progress Project',
        owner: userId,
        members: [userId]
      });

      const res = await request(app)
        .get(`/api/projects/${project._id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('percent');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('done');
      expect(res.body.percent).toBe(0);
    });

  });

});