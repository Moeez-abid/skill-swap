import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { initCloudinary } from './lib/cloudinary.js';
import { initPusher } from './lib/pusher.js';
import { startScheduledJobs } from './jobs/scheduler.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import skillRoutes from './routes/skills.js';
import matchRoutes from './routes/matches.js';
import messageRoutes from './routes/messages.js';
import sessionRoutes from './routes/sessions.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import statsRoutes from './routes/stats.js';
import dashboardRoutes from './routes/dashboard.js';

initCloudinary();
initPusher();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

startScheduledJobs();

app.listen(PORT, () => {
  console.log(`SkillSwap API running on port ${PORT}`);
});
