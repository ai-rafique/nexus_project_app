import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import path from 'path';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import requirementRoutes from './routes/requirements';
import documentRoutes from './routes/documents';
import notificationRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';
import traceLinkRoutes from './routes/tracelinks';
import testRoutes from './routes/tests';
import fatRoutes from './routes/fat';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ── Security & parsing ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:id/requirements', requirementRoutes);
app.use('/api/projects/:projectId/documents', documentRoutes);
app.use('/api/projects/:projectId', traceLinkRoutes);
app.use('/api/projects/:projectId/tests', testRoutes);
app.use('/api/projects/:projectId/fat', fatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Error handling ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
