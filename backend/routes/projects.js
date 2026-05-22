const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth');
const Project = require('../models/Project');
const User    = require('../models/User');
const Task    = require('../models/Task');
const { sendInviteEmail } = require('../config/email');

// ─── ROLE HELPERS ───────────────────────────────────
function getMemberRole(project, userId) {
  const m = project.members.find(m => m.user.toString() === userId.toString());
  return m ? m.role : null;
}

function isOwner(project, userId) {
  return getMemberRole(project, userId) === 'owner';
}

// ─── CREATE PROJECT ─────────────────────────────────
// Creator automatically becomes owner
router.post('/', protect, async (req, res) => {
  try {
    const project = await Project.create({
      name:        req.body.name,
      description: req.body.description,
      owner:       req.user.id,
      members:     [{ user: req.user.id, role: 'owner' }]
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET ALL PROJECTS FOR LOGGED IN USER ────────────
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user.id })
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET SINGLE PROJECT ─────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET MY ROLE IN A PROJECT ────────────────────────
router.get('/:id/my-role', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const role = getMemberRole(project, req.user.id);
    res.json({ role: role || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── INVITE MEMBER — OWNER ONLY ──────────────────────
router.post('/:id/invite', protect, async (req, res) => {
  try {
    const { email } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Only owner can invite
    if (!isOwner(project, req.user.id)) {
      return res.status(403).json({ message: '🚫 Only the project owner can invite members.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: '❌ No account found with this email. Ask them to register first!'
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: '⚠️ This user has not verified their email yet. Ask them to verify first!'
      });
    }

    const alreadyMember = project.members.find(
      m => m.user.toString() === user._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: '⚠️ This user is already a member!' });
    }

    project.members.push({ user: user._id, role: 'member' });
    await project.save();

    sendInviteEmail(user.email, user.name, req.user.name, project.name)
      .catch(err => console.error('📧 Invite email failed:', err.message));

    const updated = await Project.findById(req.params.id)
      .populate('members.user', 'name email');

    res.json({
      message: `✅ ${user.name} added! An invite email has been sent to ${user.email}.`,
      project: updated
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ─── REMOVE MEMBER — OWNER ONLY ──────────────────────
router.delete('/:id/member/:userId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!isOwner(project, req.user.id)) {
      return res.status(403).json({ message: '🚫 Only the project owner can remove members.' });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );
    await project.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET PROJECT PROGRESS ────────────────────────────
router.get('/:id/progress', protect, async (req, res) => {
  try {
    const tasks   = await Task.find({ project: req.params.id });
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'done').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    res.json({ total, done, percent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE PROJECT — OWNER ONLY ─────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!isOwner(project, req.user.id)) {
      return res.status(403).json({ message: '🚫 Only the project owner can delete this project.' });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Global search across all projects and tasks
router.get('/search/all', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    // Get user's projects
    const projects = await Project.find({
      members: req.user.id,
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    }).populate('owner', 'name');

    // Get tasks from user's projects
    const userProjects = await Project.find({ members: req.user.id }).select('_id name');
    const projectIds = userProjects.map(p => p._id);

    const Task = require('./tasks') // already loaded
    const TaskModel = require('../models/Task');
    const tasks = await TaskModel.find({
      project: { $in: projectIds },
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    }).populate('project', 'name');

    res.json({
      projects,
      tasks,
      total: projects.length + tasks.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;