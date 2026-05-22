const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
 
// ─── GET ANALYTICS FOR A PROJECT ────────────────────
router.get('/:projectId', protect, async (req, res) => {
  try {
    // Check membership
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
 
   const isMember = project.members.some(m => {
  const uid = m.user?._id || m.user || m;
  return uid.toString() === req.user.id.toString();
});
    if (!isMember) return res.status(403).json({ message: 'Access denied.' });
 
    const tasks = await Task.find({ project: req.params.projectId });
 
    // ── Tasks by status ──────────────────────────────
    const byStatus = {
      todo:       tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      done:       tasks.filter(t => t.status === 'done').length,
    };
 
    // ── Tasks by priority ────────────────────────────
    const byPriority = {
      low:    tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high:   tasks.filter(t => t.priority === 'high').length,
    };
 
    // ── Overdue tasks ────────────────────────────────
    const now = new Date();
    const overdue = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    ).length;
 
    // ── Completion rate ──────────────────────────────
    const total = tasks.length;
    const done  = byStatus.done;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);
 
    // ── Tasks completed per day (last 7 days) ────────
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
 
      const count = tasks.filter(t =>
        t.status === 'done' &&
        t.updatedAt >= date &&
        t.updatedAt < nextDate
      ).length;
 
      last7Days.push({
        date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count
      });
    }
 
    // ── Member workload ──────────────────────────────
    const memberWorkload = {};
    tasks.forEach(t => {
      if (t.assignedTo) {
        const id = t.assignedTo.toString();
        memberWorkload[id] = (memberWorkload[id] || 0) + 1;
      }
    });
 
    res.json({
      total,
      done,
      overdue,
      completionRate,
      byStatus,
      byPriority,
      last7Days,
      memberWorkload
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics.' });
  }
});
 
module.exports = router;