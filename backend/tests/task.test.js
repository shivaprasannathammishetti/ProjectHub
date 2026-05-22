const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let token;
let userId;
let projectId;

describe('✅ Task API Tests', () => {

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    const hashed = await bcrypt.hash('password123', 10);
    const user = await User.create({
      name: 'Task Tester',
      email: 'tasktest@gmail.com',
      password: hashed,
      isVerified: true
    });

    userId = user._id;
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const project = await Project.create({
      name: 'Task Project',
      owner: userId,
      members: [userId]
    });

    projectId = project._id;
  });

  // ─── CREATE TASK ─────────────────────────────────
  describe('POST /api/tasks', () => {

    test('✅ Should create a task successfully', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          description: 'Task description',
          priority: 'high',
          project: projectId
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Test Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    test('✅ Should create task with due date', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task with due date',
          project: projectId,
          dueDate: '2026-12-31'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.dueDate).toBeDefined();
    });

    test('❌ Should fail without auth', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'No auth task', project: projectId });

      expect(res.statusCode).toBe(401);
    });

    test('❌ Should fail without title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ project: projectId });

      expect(res.statusCode).toBe(400);
    });

  });

  // ─── GET TASKS ───────────────────────────────────
  describe('GET /api/tasks/:projectId', () => {

    test('✅ Should get all tasks for a project', async () => {
      await Task.create({
        title: 'Task 1', project: projectId, status: 'todo'
      });
      await Task.create({
        title: 'Task 2', project: projectId, status: 'done'
      });

      const res = await request(app)
        .get(`/api/tasks/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    test('✅ Should return empty array if no tasks', async () => {
      const res = await request(app)
        .get(`/api/tasks/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(0);
    });

  });

  // ─── UPDATE TASK ─────────────────────────────────
  describe('PUT /api/tasks/:id', () => {

    test('✅ Should update task status', async () => {
      const task = await Task.create({
        title: 'Update Me',
        project: projectId,
        status: 'todo'
      });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('done');
    });

    test('✅ Should update task priority', async () => {
      const task = await Task.create({
        title: 'Priority Task',
        project: projectId,
        priority: 'low'
      });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ priority: 'high' });

      expect(res.statusCode).toBe(200);
      expect(res.body.priority).toBe('high');
    });

    test('✅ Should update task title and description', async () => {
      const task = await Task.create({
        title: 'Old Title',
        description: 'Old desc',
        project: projectId
      });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title', description: 'New desc' });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.description).toBe('New desc');
    });

  });

  // ─── DELETE TASK ─────────────────────────────────
  describe('DELETE /api/tasks/:id', () => {

    test('✅ Should delete a task', async () => {
      const task = await Task.create({
        title: 'Delete This',
        project: projectId
      });

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      const found = await Task.findById(task._id);
      expect(found).toBeNull();
    });

  });

  // ─── ADD COMMENT ─────────────────────────────────
  describe('POST /api/tasks/:id/comment', () => {

    test('✅ Should add a comment to task', async () => {
      const task = await Task.create({
        title: 'Comment Task',
        project: projectId
      });

      const res = await request(app)
        .post(`/api/tasks/${task._id}/comment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'This is a test comment' });

      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBe(1);
      expect(res.body.comments[0].text).toBe('This is a test comment');
    });

    test('✅ Should add multiple comments', async () => {
      const task = await Task.create({
        title: 'Multi Comment Task',
        project: projectId
      });

      await request(app)
        .post(`/api/tasks/${task._id}/comment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'First comment' });

      const res = await request(app)
        .post(`/api/tasks/${task._id}/comment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Second comment' });

      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBe(2);
    });

  });

});