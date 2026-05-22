const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    {
    type: String,
    enum: ['task_assigned', 'comment_added', 'task_moved', 'member_invited'],
    required: true
  },
  message: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  task:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);