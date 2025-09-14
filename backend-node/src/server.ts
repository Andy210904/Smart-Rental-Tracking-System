import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { router as equipmentRouter } from './routes/equipment';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) || '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Smart Rental Tracking System API (Node)', version: '0.1.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'Smart Rental Tracker API (Node)' });
});

app.use('/equipment', equipmentRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Node API running on http://localhost:${PORT}`);
});
