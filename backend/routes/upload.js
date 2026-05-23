const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/auth');
const { upload, cloudinary } = require('../config/upload');
const Task     = require('../models/Task');
const Project  = require('../models/Project');

// ─── HELPER: Check membership ────────────────────────
async function isMember(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return false;
  return project.members.some(m => m.user.toString() === userId.toString());
}

// ─── UPLOAD FILE TO TASK ─────────────────────────────
router.post('/task/:taskId', protect, upload.single('file'), async (req, res) => {
  try {
    console.log('[Upload] File received:', JSON.stringify(req.file));
    console.log('[Upload] Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY    ? 'SET' : 'MISSING',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMember(task.project, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Cloudinary gives us path (URL) and filename (public_id)
    task.attachments.push({
      filename:     req.file.filename,      // Cloudinary public_id
      originalName: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
      url:          req.file.path,          // Cloudinary URL
      uploadedBy:   req.user.id
    });

    await task.save();
    res.json({ message: '✅ File uploaded successfully!', task });
  } catch (err) {
    console.error('[Upload] Full error:', JSON.stringify(err));
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE ATTACHMENT ───────────────────────────────
router.delete('/task/:taskId/attachment/:attachmentId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await isMember(task.project, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Delete from Cloudinary
    if (attachment.filename) {
      const isImage = attachment.mimetype?.startsWith('image/');
      try {
        await cloudinary.uploader.destroy(attachment.filename, {
          resource_type: isImage ? 'image' : 'raw'
        });
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr.message);
      }
    }

    attachment.deleteOne();
    await task.save();

    res.json({ message: 'Attachment deleted', task });
  } catch (err) {
    console.error('[Delete] Full error:', JSON.stringify(err));
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;