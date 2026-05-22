const cron       = require('node-cron');
const Task        = require('../models/Task');
const Notification = require('../models/Notification');
const nodemailer  = require('nodemailer');

// ── Email transporter ────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Helper: send reminder email ───────────────────────
async function sendReminderEmail({ to, name, taskTitle, projectName, dueDate, type }) {
  const subjects = {
    tomorrow : `⏰ Task due tomorrow: "${taskTitle}"`,
    today    : `🚨 Task due TODAY: "${taskTitle}"`,
    overdue  : `❗ Overdue task: "${taskTitle}"`
  };

  const messages = {
    tomorrow : `Hi ${name},\n\nYour task "<b>${taskTitle}</b>" in project "<b>${projectName}</b>" is due <b>tomorrow (${dueDate})</b>.\n\nPlease make sure to complete it on time.`,
    today    : `Hi ${name},\n\nYour task "<b>${taskTitle}</b>" in project "<b>${projectName}</b>" is due <b>TODAY (${dueDate})</b>.\n\nPlease complete it as soon as possible!`,
    overdue  : `Hi ${name},\n\nYour task "<b>${taskTitle}</b>" in project "<b>${projectName}</b>" was due on <b>${dueDate}</b> and is now <b>OVERDUE</b>.\n\nPlease take immediate action.`
  };

  const colors = {
    tomorrow : '#6366f1',
    today    : '#f59e0b',
    overdue  : '#ef4444'
  };

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden">
      <div style="background:${colors[type]};padding:24px 32px">
        <h1 style="margin:0;color:#fff;font-size:20px">${subjects[type]}</h1>
      </div>
      <div style="padding:32px;color:#e2e8f0">
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px">${messages[type]}</p>
        <div style="background:#1e293b;border-radius:12px;padding:16px 20px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#64748b;font-size:13px">Task</span>
            <span style="color:#e2e8f0;font-size:13px;font-weight:600">${taskTitle}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#64748b;font-size:13px">Project</span>
            <span style="color:#e2e8f0;font-size:13px;font-weight:600">${projectName}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748b;font-size:13px">Due Date</span>
            <span style="color:${colors[type]};font-size:13px;font-weight:600">${dueDate}</span>
          </div>
        </div>
        <p style="color:#475569;font-size:12px;margin:0">— ProjectHub Reminder System</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from   : `"ProjectHub" <${process.env.EMAIL_USER}>`,
      to,
      subject: subjects[type],
      html
    });
    console.log(`[Reminder] Email sent to ${to} — ${type}: "${taskTitle}"`);
  } catch (err) {
    console.error(`[Reminder] Email failed for ${to}:`, err.message);
  }
}

// ── Helper: create in-app notification ───────────────
async function createReminderNotification({ userId, taskId, projectId, message, type, io }) {
  try {
    const notif = await Notification.create({
      user   : userId,
      message,
      type   : 'task_assigned',  // reuse existing type for bell display
      task   : taskId,
      project: projectId,
      isRead : false
    });

    // Emit real-time to user if they're online
    if (io) {
      io.to(userId.toString()).emit('newNotification', notif);
    }
  } catch (err) {
    console.error('[Reminder] Notification create error:', err.message);
  }
}

// ── Main reminder checker ─────────────────────────────
async function checkDueDates(io) {
  console.log('\n[Reminder] Running due date check...');

  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  try {
    // Get all incomplete tasks that have a due date and an assigned user
    const tasks = await Task.find({
      dueDate   : { $exists: true, $ne: null },
      status    : { $ne: 'done' },
      assignedTo: { $exists: true, $ne: null }
    })
    .populate('assignedTo', 'name email')
    .populate('project',    'name');

    console.log(`[Reminder] Found ${tasks.length} tasks to check`);

    let remindersCount = 0;

    for (const task of tasks) {
      const due      = new Date(task.dueDate);
      const dueDay   = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const user     = task.assignedTo;
      const project  = task.project;

      if (!user?.email) continue;

      const dueDateStr = due.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      let reminderType = null;
      let message      = null;

      // ── Overdue (past today) ──
      if (dueDay < today) {
        reminderType = 'overdue';
        message      = `❗ Overdue: "${task.title}" was due on ${dueDateStr}`;
      }
      // ── Due today ──
      else if (dueDay.getTime() === today.getTime()) {
        reminderType = 'today';
        message      = `🚨 Due TODAY: "${task.title}" — complete it now!`;
      }
      // ── Due tomorrow ──
      else if (dueDay.getTime() === tomorrow.getTime()) {
        reminderType = 'tomorrow';
        message      = `⏰ Due tomorrow: "${task.title}" — don't forget!`;
      }

      if (reminderType) {
        // Send email
        await sendReminderEmail({
          to         : user.email,
          name       : user.name,
          taskTitle  : task.title,
          projectName: project?.name || 'Unknown Project',
          dueDate    : dueDateStr,
          type       : reminderType
        });

        // Create in-app notification
        await createReminderNotification({
          userId   : user._id,
          taskId   : task._id,
          projectId: task.project?._id,
          message,
          io
        });

        remindersCount++;
      }
    }

    console.log(`[Reminder] Sent ${remindersCount} reminders\n`);
  } catch (err) {
    console.error('[Reminder] Error during check:', err.message);
  }
}

// ── Start the cron job ────────────────────────────────
function startReminderJob(io) {
  // Runs every day at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[Reminder] ⏰ 8:00 AM — running daily reminder check');
    checkDueDates(io);
  }, {
    timezone: 'Asia/Kolkata'  // IST timezone
  });

  console.log('[Reminder] ✅ Due date reminder job scheduled — runs daily at 8:00 AM IST');
}

module.exports = { startReminderJob, checkDueDates };