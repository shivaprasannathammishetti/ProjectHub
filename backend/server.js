const dotenv = require('dotenv');
dotenv.config(); // ← MUST be the very first two lines before anything else

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const session    = require('express-session');
const passport   = require('./config/passport');
const { Server } = require('socket.io');
const connectDB  = require('./config/db');

connectDB();

const { startReminderJob, checkDueDates } = require('./utils/reminderJob');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// ── Middleware ─────────────────────────────────────────
app.use(cors({
  origin:         '*',
  methods:        ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── Session ────────────────────────────────────────────
app.use(session({
  secret:            process.env.JWT_SECRET || 'session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false }
}));

// ── Passport ───────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Pass io to routes ──────────────────────────────────
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/activity',      require('./routes/activity'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/uploads',           express.static('uploads'));
app.use('/api/upload',        require('./routes/upload'));

// ── Health check ───────────────────────────────────────
app.get('/', (req, res) => res.send('Project Management API is running...'));
app.get('/test-cloudinary', async (req, res) => {
  const cloudinary = require('cloudinary').v2;
  try {
    const result = await cloudinary.api.ping();
    res.json({ status: 'ok', result });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});
// ── Socket.io ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('joinProject',     (projectId) => socket.join(projectId));
  socket.on('joinUser',        (userId)    => socket.join(userId));
  socket.on('taskUpdated',     (data)      => io.to(data.projectId).emit('taskUpdated', data));
  socket.on('newNotification', (data)      => io.to(data.userId).emit('newNotification', data));
  socket.on('disconnect',      ()          => console.log('User disconnected:', socket.id));
});

// ── Start server ───────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startReminderJob(io);
    checkDueDates(io);
  });
}

module.exports = { app, server, io };