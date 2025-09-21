import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { router as equipmentRouter } from './routes/equipment';
import { router as sitesRouter } from './routes/sites';
import { router as operatorsRouter } from './routes/operators';
import { router as rentalsRouter } from './routes/rentals';
import { router as dashboardRouter } from './routes/dashboard';
import { router as mlRouter } from './routes/ml';
import { router as alertsRouter } from './routes/alerts';
import { router as usageLogsRouter } from './routes/usageLogs';

dotenv.config();

const app = express();

app.use(helmet());
// Configure CORS: allow all by default, or restrict to ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : '*',
  })
);
app.use(express.json());

// Disable caching so UI always sees freshest data
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Smart Rental Tracking System API (Node)', version: '0.1.0' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'Smart Rental Tracker API (Node)' });
});

app.use('/', dashboardRouter);
app.use('/', mlRouter);
app.use('/equipment', equipmentRouter);
app.use('/sites', sitesRouter);
app.use('/operators', operatorsRouter);
app.use('/rentals', rentalsRouter);
app.use('/alerts', alertsRouter);
app.use('/usage-logs', usageLogsRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Node API running on http://localhost:${PORT}`);
});
