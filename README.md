# 🗂️ ProjectHub — Full-Stack Project Management App

<div align="center">

![ProjectHub Banner](https://img.shields.io/badge/ProjectHub-Full%20Stack%20App-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xOSAzSDVhMiAyIDAgMCAwLTIgMnYxNGEyIDIgMCAwIDAgMiAyaDE0YTIgMiAwIDAgMCAyLTJWNWEyIDIgMCAwIDAtMi0yem0tNSAxNEg3di0yaDd2MnptMy00SDd2LTJoMTB2MnptMC00SDd2LTJoMTB2MnoiLz48L3N2Zz4=)

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://projecthub-frontend-iota.vercel.app/)
[![Backend API](https://img.shields.io/badge/⚙️_Backend_API-Render-46E3B7?style=for-the-badge&logo=render)](https://projecthub-backend-scfj.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-shivaprasannathammishetti-181717?style=for-the-badge&logo=github)](https://github.com/shivaprasannathammishetti)

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)

> A full-featured, real-time project management application built as a **CodeAlpha Internship Project**. Manage projects, assign tasks, collaborate with teammates, and track progress — all in one place.

</div>

---

## 🌐 Live Links

| Service | URL |
|---------|-----|
| 🎨 Frontend | [projecthub-frontend-iota.vercel.app](https://projecthub-frontend-iota.vercel.app/) |
| ⚙️ Backend API | [projecthub-backend-scfj.onrender.com](https://projecthub-backend-scfj.onrender.com) |
| 👤 Developer | [github.com/shivaprasannathammishetti](https://github.com/shivaprasannathammishetti) |

---

## ✨ Features

### 🔐 Authentication & Security
- **JWT-based authentication** with 7-day token expiry
- **Email verification** via Brevo SMTP on registration
- **Google OAuth 2.0** — Login / Register with Google (Passport.js)
- Role-based access control — **Owner** vs **Member** permissions

### 📋 Project Management
- Create, view, and delete projects
- Invite team members via email
- Owner/Member role badges on dashboard
- Project-level progress tracking with visual progress bar

### ✅ Task Management (Kanban Board)
- **Drag-and-drop** tasks across columns: `To Do → In Progress → Done`
- Create, edit, delete tasks (owner only)
- Set **priority** (High / Medium / Low) with color-coded badges
- Set **due dates** with overdue highlighting
- **Assign tasks** to project members
- Add **comments** to tasks

### 📎 File Attachments
- Upload files to tasks (PDF, images, Word, Excel, ZIP)
- Powered by **Cloudinary** cloud storage
- Max 5MB per file
- Download and delete attachments

### 🔔 Real-Time Notifications
- **Socket.io** powered live updates across all connected clients
- Bell icon with unread count badge
- Notification types: task assigned, comment added, task moved, member invited
- Mark as read / Mark all read / Delete notifications

### 📊 Analytics Dashboard
- Task completion charts (Doughnut)
- Priority breakdown (Bar chart)
- Last 7 days completion trend (Line chart)
- Powered by **Chart.js**

### 🔍 Global Search
- Search across **projects**, **tasks**, and **users** simultaneously
- Debounced input with highlighted matches
- Powered by MongoDB text indexes

### 🗓️ Due Date Reminders
- Automated daily email reminders for tasks due today
- Scheduled with **node-cron** (runs at 8:00 AM IST)

### 📜 Activity Log
- Paginated activity log per project
- Tracks: task created, moved, deleted, commented
- Shows user avatars, action type, and timestamp

### 🎨 UI / UX
- **Dark / Light theme** toggle with localStorage persistence
- Fully **mobile responsive**
- Clean, modern design with CSS variables
- Smooth animations and hover effects

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| HTML5, CSS3, JavaScript (Vanilla) | Core frontend |
| Socket.io Client | Real-time updates |
| Chart.js | Analytics charts |
| Font Awesome 6 | Icons |
| Google Fonts (Inter) | Typography |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express.js | REST API server |
| MongoDB + Mongoose | Database & ODM |
| Socket.io | WebSocket real-time communication |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| Passport.js + Google OAuth 2.0 | Social login |
| Nodemailer + Brevo SMTP | Email verification & invites |
| Cloudinary + Multer | File upload & storage |
| node-cron | Scheduled reminder jobs |
| express-session | Session management |

### DevOps & Deployment
| Service | Purpose |
|---------|---------|
| Render | Backend hosting (free tier) |
| Vercel | Frontend hosting (free tier) |
| MongoDB Atlas | Cloud database |
| Cloudinary | Media storage |
| Brevo | Transactional email |
| GitHub | Version control |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Cloudinary account
- Brevo (formerly Sendinblue) account
- Google Cloud Console project (for OAuth)

### 1. Clone the repository
```bash
git clone https://github.com/shivaprasannathammishetti/ProjectHub.git
cd ProjectHub
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure environment variables
Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/projectmanagement
JWT_SECRET=your_jwt_secret_here

# Email (Brevo SMTP)
BREVO_SMTP_LOGIN=your_brevo_smtp_login
BREVO_API_KEY=your_brevo_smtp_key
BREVO_SENDER_EMAIL=your_verified_sender@gmail.com
BREVO_SENDER_NAME=ProjectHub

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://127.0.0.1:5500/frontend
```

### 4. Start the backend
```bash
node server.js
# Server running on port 5000
```

### 5. Open the frontend
Open `frontend/index.html` with **Live Server** (VS Code extension) at `http://127.0.0.1:5500`

---

## 📁 Project Structure

```
ProjectHub/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── email.js           # Brevo SMTP setup
│   │   ├── passport.js        # Google OAuth strategy
│   │   └── upload.js          # Cloudinary + Multer config
│   ├── middleware/
│   │   ├── auth.js            # JWT protect middleware
│   │   └── roleMiddleware.js  # Owner/Member role check
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── Project.js         # Project schema
│   │   ├── Task.js            # Task schema
│   │   ├── Activity.js        # Activity log schema
│   │   └── Notification.js    # Notification schema
│   ├── routes/
│   │   ├── auth.js            # Register, Login, Google OAuth
│   │   ├── projects.js        # Project CRUD + invite
│   │   ├── tasks.js           # Task CRUD + comments
│   │   ├── activity.js        # Activity log
│   │   ├── notifications.js   # Notifications
│   │   ├── search.js          # Global search
│   │   ├── analytics.js       # Project analytics
│   │   └── upload.js          # File upload/delete
│   ├── utils/
│   │   └── reminderJob.js     # Cron job for due date emails
│   ├── tests/                 # 33 unit tests
│   └── server.js              # Express app entry point
├── frontend/
│   ├── index.html             # Single-page app
│   ├── app.js                 # All frontend JavaScript
│   └── style.css              # All styles + CSS variables
└── README.md
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email |
| GET | `/api/auth/verify/:token` | Verify email |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/google` | Google OAuth redirect |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get all user projects |
| POST | `/api/projects` | Create project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/invite` | Invite member |
| GET | `/api/projects/:id/progress` | Get progress |
| GET | `/api/projects/:id/my-role` | Get current user's role |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/:projectId` | Get project tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comment` | Add comment |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=` | Global search |
| GET | `/api/analytics/:projectId` | Project analytics |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/activity/:projectId` | Paginated activity log |
| POST | `/api/upload/task/:id` | Upload file attachment |

---

## 🧪 Testing

This project includes **33 unit tests** covering authentication, project management, and task operations.

```bash
cd backend
npm test
```

---

## 👤 Developer

**Thammishetti Shiva Prasanna**

[![GitHub](https://img.shields.io/badge/GitHub-shivaprasannathammishetti-181717?style=flat-square&logo=github)](https://github.com/shivaprasannathammishetti)

Built as part of the **CodeAlpha Full Stack Developer Internship** program.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

Made with ❤️ by [Thammishetti Shiva Prasanna](https://github.com/shivaprasannathammishetti)

</div>