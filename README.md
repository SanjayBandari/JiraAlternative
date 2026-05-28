# TicketDesk — Simple Project Tracking

A lightweight, intuitive ticketing tool. The clean alternative to Jira.

## Tech Stack
- **Frontend** — React + Vite → deployed on Vercel (free)
- **Backend** — Node.js + Express → deployed on Render (free)
- **Database** — Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Email** — Resend API (3,000/month free)

---

## Setup in 5 steps

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run both migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_realtime_and_storage.sql`
3. Copy your **Project URL**, **anon key**, and **service_role key** from Project Settings → API

### 2. Resend
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add and verify your sending domain (or use the sandbox for dev)

### 3. Backend (local)
```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev         # → http://localhost:4000
```

### 4. Frontend (local)
```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev         # → http://localhost:5173
```

### 5. Deploy
**Backend → Render**
- Push to GitHub, connect repo in Render, select `backend/` as root
- Add env vars from `backend/.env.example`
- Uses `render.yaml` for config

**Frontend → Vercel**
- Connect repo in Vercel, set root to `frontend/`
- Add env vars from `frontend/.env.example`
- Update `vercel.json` with your Render backend URL

---

## Project Structure
```
├── supabase/
│   └── migrations/          # Run these in Supabase SQL Editor
├── backend/
│   ├── src/
│   │   ├── index.js          # Express entry point
│   │   ├── middleware/auth.js # JWT verification
│   │   ├── lib/supabase.js   # Supabase clients
│   │   ├── services/
│   │   │   ├── email.js      # Resend email templates
│   │   │   └── activity.js   # Activity log + notifications
│   │   └── routes/           # One file per resource
│   └── render.yaml
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── context/AuthContext.jsx
    │   ├── lib/
    │   │   ├── api.js        # All API calls
    │   │   ├── supabase.js
    │   │   └── utils.js      # Status/priority configs
    │   ├── pages/            # Route-level components
    │   └── components/       # Shared UI components
    └── vercel.json
```

---

## Features (V1)
- ✅ Multi-tenant workspaces with RLS isolation
- ✅ Email invitations with role-based access (Admin / Member / Viewer)
- ✅ Ticket CRUD — title, description, status, priority, category, assignee, due date
- ✅ Kanban board with drag-and-drop
- ✅ Dashboard with filters, search, stats
- ✅ Activity log on every ticket
- ✅ Threaded comments
- ✅ File/screenshot attachments (Supabase Storage)
- ✅ Email notifications (assigned, commented, due soon)
- ✅ In-app notification bell
- ✅ Onboarding flow (workspace → project → first ticket in < 5 min)
