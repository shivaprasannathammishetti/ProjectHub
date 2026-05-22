const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Activity = require('../models/Activity');

// GET activity for a project (paginated)
// Query params: ?page=1&limit=10
router.get('/:projectId', protect, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const total = await Activity.countDocuments({ project: req.params.projectId });

    const activities = await Activity.find({ project: req.params.projectId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Activity fetch error:', err.message);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

module.exports = router;