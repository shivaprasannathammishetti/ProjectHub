const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const protect = require('../middleware/auth');
const upload = require('../config/upload');
const Task = require('../models/Task');
const Project = require('../models/Project');

// ─── HELPER: Check membership ───────────────────────
async function isMember(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return false;
  return project.members.some(m => m.user.toString() === userId.toString());
}

// ─── UPLOAD FILE TO TASK ────────────────────────────
router.post('/task/:taskId', protect, upload.single('file'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMember(task.project, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    task.attachments.push({
      filename:     req.file.filename,
      originalName: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
      uploadedBy:   req.user.id
    });

    await task.save();
    res.json({ message: '✅ File uploaded successfully!', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DOWNLOAD / VIEW FILE ───────────────────────────
router.get('/download/:filename', protect, (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE ATTACHMENT ──────────────────────────────
router.delete('/task/:taskId/attachment/:attachmentId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMember(task.project, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Delete file from disk
    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    attachment.deleteOne();
    await task.save();

    res.json({ message: 'Attachment deleted', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;