import { Router, Request, Response } from 'express';

// Simple stubs to keep frontend working while we migrate Python ML
export const router = Router();

router.get('/ml/status', (_req: Request, res: Response) => {
  res.json({
    models_loaded: false,
    demand_forecasting: 'unavailable',
    anomaly_detection: 'unavailable',
    recommendations: 'unavailable',
    analytics: 'available'
  });
});

router.post('/ml/demand-forecast', (_req: Request, res: Response) => {
  res.status(503).json({ detail: 'ML system is not available in Node yet.' });
});

router.post('/ml/demand-forecast/bulk', (_req: Request, res: Response) => {
  res.status(503).json({ detail: 'ML system is not available in Node yet.' });
});

router.post('/ml/anomaly-detection', (_req: Request, res: Response) => {
  res.status(503).json({ detail: 'ML system is not available in Node yet.' });
});

router.get('/ml/anomaly-detection/summary', (_req: Request, res: Response) => {
  res.status(503).json({ detail: 'ML system is not available in Node yet.' });
});

router.get('/ml/health', (_req: Request, res: Response) => {
  res.json({ status: 'unhealthy', ml_system_available: false });
});
