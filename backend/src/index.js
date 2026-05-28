import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter       from './routes/auth.js';
import tenantsRouter    from './routes/tenants.js';
import projectsRouter   from './routes/projects.js';
import ticketsRouter    from './routes/tickets.js';
import commentsRouter   from './routes/comments.js';
import activityRouter   from './routes/activity.js';
import notificationsRouter from './routes/notifications.js';
import uploadsRouter    from './routes/uploads.js';
import invitationsRouter from './routes/invitations.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// Global rate limiter: 200 req / 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/tenants',       tenantsRouter);
app.use('/api/projects',      projectsRouter);
app.use('/api/tickets',       ticketsRouter);
app.use('/api/comments',      commentsRouter);
app.use('/api/activity',      activityRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/uploads',       uploadsRouter);
app.use('/api/invitations',   invitationsRouter);

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── 404 handler ────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Something went wrong. Please try again.',
  });
});

app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));

export default app;
