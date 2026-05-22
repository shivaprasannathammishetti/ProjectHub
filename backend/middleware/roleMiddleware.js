const Project = require('../models/Project');

// Check if user is owner of the project
const isOwner = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId || req.body.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = project.members.find(
      m => m.user.toString() === req.user.id
    );

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only the project owner can do this' });
    }

    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if user is at least a member (owner or member)
const isMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId || req.body.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = project.members.find(
      m => m.user.toString() === req.user.id
    );

    if (!member) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }

    req.userRole = member.role;
    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { isOwner, isMember };