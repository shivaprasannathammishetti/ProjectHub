const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

router.get('/', protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    // Get all projects where user is a member (new schema: members.user)
    const userProjects = await Project.find({
      'members.user': req.user.id
    }).select('_id name');

    const projectIds = userProjects.map(p => p._id);

    // Search projects by name or description
    const projects = await Project.find({
      'members.user': req.user.id,
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    }).populate('owner', 'name').limit(5);

    // Search tasks across user's projects
    const tasks = await Task.find({
      project: { $in: projectIds },
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    }).populate('project', 'name').limit(10);

    // Search verified users
    const users = await User.find({
      _id: { $ne: req.user.id },
      isVerified: true,
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    }).select('name email').limit(5);

    res.json({
      projects,
      tasks,
      users,
      total: projects.length + tasks.length + users.length
    });

  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;