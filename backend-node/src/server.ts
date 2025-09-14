import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { router as equipmentRouter } from './routes/equipment';
import { router as sitesRouter } from './routes/sites';
import { router as operatorsRouter } from './routes/operators';
import { router as rentalsRouter } from './routes/rentals';
import { router as dashboardRouter } from './routes/dashboard';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) || '*' }));
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Smart Rental Tracking System API (Node)', version: '0.1.0' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'Smart Rental Tracker API (Node)' });
});

app.use('/', dashboardRouter);
app.use('/equipment', equipmentRouter);
app.use('/sites', sitesRouter);
app.use('/operators', operatorsRouter);
app.use('/rentals', rentalsRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Node API running on http://localhost:${PORT}`);
});
