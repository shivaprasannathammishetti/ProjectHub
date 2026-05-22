const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/auth');
const Task     = require('../models/Task');
const Project  = require('../models/Project');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// ─── HELPER: Get member role ─────────────────────────
async function getMemberRole(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const m = project.members.find(m => m.user.toString() === userId.toString());
  return m ? m.role : null;
}

// ─── HELPER: Check membership (any role) ────────────
async function isMember(projectId, userId) {
  const role = await getMemberRole(projectId, userId);
  return role !== null;
}

// ─── HELPER: Log activity ────────────────────────────
async function logActivity({ project, user, action, taskTitle, detail }) {
  try {
    await Activity.create({ project, user, action, taskTitle, detail });
    console.log(`[Activity] ${action} - ${taskTitle}`);
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

// ─── HELPER: Create notification + emit via socket ──
async function createNotification({ userId, actorId, message, type, projectId, taskId, io }) {
  try {
    if (userId.toString() === actorId.toString()) return;
    const notif = await Notification.create({
      user:    userId,
      actor:   actorId,
      message,
      type,
      project: projectId,
      task:    taskId
    });
    if (io) {
      io.to(userId.toString()).emit('newNotification', notif);
      console.log(`[Socket] Notification emitted to user: ${userId}`);
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

// ─── HELPER: Notify all project members ─────────────
async function notifyMembers({ projectId, actorId, message, type, taskId, io }) {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;
    for (const m of project.members) {
      await createNotification({
        userId:    m.user,
        actorId,
        message,
        type,
        projectId,
        taskId,
        io
      });
    }
  } catch (err) {
    console.error('Notify members error:', err.message);
  }
}

// ─── CREATE TASK — OWNER ONLY ────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, priority, dueDate, project } = req.body;

    if (!title || title.trim().length < 2)
      return res.status(400).json({ message: 'Title must be at least 2 characters' });
    if (!project)
      return res.status(400).json({ message: 'Project ID is required' });

    const role = await getMemberRole(project, req.user.id);
    if (!role) return res.status(403).json({ message: 'Access denied.' });

    // Only owners can create tasks
    if (role !== 'owner') {
      return res.status(403).json({ message: '🚫 Only the project owner can create tasks.' });
    }

    const task = await Task.create({ title, description, priority, dueDate, project });

    await logActivity({
      project,
      user:      req.user.id,
      action:    'created task',
      taskTitle: title,
      detail:    `Priority: ${priority || 'medium'}`
    });

    await notifyMembers({
      projectId: project,
      actorId:   req.user.id,
      message:   `New task created: "${title}"`,
      type:      'task_assigned',
      taskId:    task._id,
      io:        req.io
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err.message);
    res.status(500).json({ message: 'Failed to create task.' });
  }
});

// ─── GET TASKS BY PROJECT — ALL MEMBERS ─────────────
router.get('/:projectId', protect, async (req, res) => {
  try {
    const member = await isMember(req.params.projectId, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied.' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});

// ─── UPDATE TASK ─────────────────────────────────────
// Status change → all members allowed
// Edit title/desc/priority/due → owner only
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getMemberRole(task.project, req.user.id);
    if (!role) return res.status(403).json({ message: 'Access denied.' });

    // If editing fields other than status/assignedTo → owner only
    const ownerOnlyFields = ['title', 'description', 'priority', 'dueDate'];
    const isEditingOwnerFields = ownerOnlyFields.some(f => req.body[f] !== undefined);
    if (isEditingOwnerFields && role !== 'owner') {
      return res.status(403).json({ message: '🚫 Only the project owner can edit task details.' });
    }

    // Notify on status change
    if (req.body.status && req.body.status !== task.status) {
      await logActivity({
        project:   task.project,
        user:      req.user.id,
        action:    'moved task',
        taskTitle: task.title,
        detail:    `${task.status} → ${req.body.status}`
      });
      await notifyMembers({
        projectId: task.project,
        actorId:   req.user.id,
        message:   `Task "${task.title}" moved to ${req.body.status}`,
        type:      'task_moved',
        taskId:    task._id,
        io:        req.io
      });
    }

    // Notify assigned user — owner only action
    if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
      if (role !== 'owner') {
        return res.status(403).json({ message: '🚫 Only the project owner can assign tasks.' });
      }
      await createNotification({
        userId:    req.body.assignedTo,
        actorId:   req.user.id,
        message:   `You were assigned to task: "${task.title}"`,
        type:      'task_assigned',
        projectId: task.project,
        taskId:    task._id,
        io:        req.io
      });
    }

    const updated = await Task.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    ).populate('assignedTo', 'name email');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

// ─── ADD COMMENT — ALL MEMBERS ───────────────────────
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMember(task.project, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied.' });

    if (!req.body.text || req.body.text.trim() === '')
      return res.status(400).json({ message: 'Comment cannot be empty' });

    task.comments.push({ user: req.user.id, text: req.body.text });
    await task.save();

    await logActivity({
      project:   task.project,
      user:      req.user.id,
      action:    'commented on task',
      taskTitle: task.title,
      detail:    req.body.text.substring(0, 60)
    });

    await notifyMembers({
      projectId: task.project,
      actorId:   req.user.id,
      message:   `New comment on "${task.title}": "${req.body.text.substring(0, 40)}..."`,
      type:      'comment_added',
      taskId:    task._id,
      io:        req.io
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment.' });
  }
});

// ─── DELETE TASK — OWNER ONLY ────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const role = await getMemberRole(task.project, req.user.id);
    if (!role) return res.status(403).json({ message: 'Access denied.' });

    if (role !== 'owner') {
      return res.status(403).json({ message: '🚫 Only the project owner can delete tasks.' });
    }

    await logActivity({
      project:   task.project,
      user:      req.user.id,
      action:    'deleted task',
      taskTitle: task.title,
      detail:    null
    });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task.' });
  }
});

module.exports = router;