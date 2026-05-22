const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  status:      { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate:     { type: Date },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    date: { type: Date, default: Date.now }
  }],
  attachments: [{
    filename:     { type: String },
    originalName: { type: String },
    mimetype:     { type: String },
    size:         { type: Number },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt:   { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);