const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Notification = require('../models/Notification');

// ─── GET ALL NOTIFICATIONS FOR LOGGED-IN USER ────────
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});

// ─── MARK ALL AS READ ────────────────────────────────
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notifications.' });
  }
});

// ─── MARK ONE AS READ ────────────────────────────────
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification.' });
  }
});

// ─── DELETE ONE NOTIFICATION ─────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notification.' });
  }
});

module.exports = router;