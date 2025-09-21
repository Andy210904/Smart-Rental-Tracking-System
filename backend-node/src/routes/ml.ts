import { Router, Request, Response } from 'express';
import axios from 'axios';

export const router = Router();

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const FALLBACK_ON_ERROR = (process.env.ML_FALLBACK_ON_ERROR ?? 'true').toLowerCase() !== 'false';

function normalizeForecastPayload(req: Request) {
  const q = req.query || {};
  const b = (req.body || {}) as any;
  // Accept both query param and body values; body wins when provided
  const site_id = b.site_id ?? (typeof q.site_id === 'string' ? q.site_id : undefined);
  const equipment_type = b.equipment_type ?? (typeof q.equipment_type === 'string' ? q.equipment_type : undefined);
  const days_ahead_str = b.days_ahead ?? (typeof q.days_ahead === 'string' ? q.days_ahead : undefined);
  const horizon_days_body = b.horizon_days;
  const horizon_days = Number(horizon_days_body ?? days_ahead_str ?? 14);
  return { site_id, equipment_type, horizon_days: isFinite(horizon_days) && horizon_days > 0 ? horizon_days : 14 };
}

function buildForecastFallback(payload: { site_id?: string; equipment_type?: string; horizon_days: number }) {
  const today = new Date();
  const forecast = Array.from({ length: payload.horizon_days }, (_v, i) => {
    const d = new Date(today.getTime() + (i + 1) * 24 * 3600 * 1000);
    const predicted = 5 + (i % 7);
    const confidence = Math.min(0.95, 0.7 + ((i % 5) * 0.05));
    return {
      date: d.toISOString().slice(0, 10),
      predicted_demand: predicted,
      confidence: Number(confidence.toFixed(2))
    };
  });
  const total = forecast.reduce((acc, it) => acc + (Number(it.predicted_demand) || 0), 0);
  const avg = forecast.length ? total / forecast.length : 0;
  const peak = forecast.reduce((a, b) => (b.predicted_demand > a.predicted_demand ? b : a), forecast[0]);
  const min = forecast.reduce((a, b) => (b.predicted_demand < a.predicted_demand ? b : a), forecast[0]);
  const dayOfWeek = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const trend = forecast.length && forecast[forecast.length - 1].predicted_demand > forecast[0].predicted_demand ? 'increasing'
    : forecast.length && forecast[forecast.length - 1].predicted_demand < forecast[0].predicted_demand ? 'decreasing' : 'stable';
  const trend_strength = forecast.length > 1
    ? Math.min(1, Math.abs(forecast[forecast.length - 1].predicted_demand - forecast[0].predicted_demand) / Math.max(1, avg))
    : 0;
  return {
    site_id: payload.site_id,
    equipment_type: payload.equipment_type,
    horizon_days: payload.horizon_days,
    forecast_days: payload.horizon_days,
    forecast,
    forecasts: forecast,
    total_predicted_demand: total,
    average_daily_demand: avg,
    peak_demand_day: peak ? { ...peak, day_of_week: dayOfWeek(peak.date) } : undefined,
    min_demand_day: min ? { ...min, day_of_week: dayOfWeek(min.date) } : undefined,
    low_demand_day: min ? { ...min, day_of_week: dayOfWeek(min.date) } : undefined,
    trend,
    trend_strength,
    generated_at: new Date().toISOString(),
    fallback: true
  };
}

function normalizeForecastResponse(data: any) {
  if (!data) return data;
  const forecasts = Array.isArray(data.forecasts)
    ? data.forecasts
    : Array.isArray(data.forecast)
      ? data.forecast
      : [];
  const total = typeof data.total_predicted_demand === 'number'
    ? data.total_predicted_demand
    : forecasts.reduce((acc: number, it: any) => acc + (Number(it?.predicted_demand) || 0), 0);
  const denom = forecasts?.length || Number(data?.horizon_days) || 0;
  const avg = typeof data.average_daily_demand === 'number'
    ? data.average_daily_demand
    : (denom > 0 ? total / denom : 0);
  const dayOfWeek = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const peak = data?.peak_demand_day ?? (forecasts.length ? forecasts.reduce((a: any, b: any) => (Number(b?.predicted_demand||0) > Number(a?.predicted_demand||0) ? b : a), forecasts[0]) : undefined);
  const min = data?.min_demand_day ?? data?.low_demand_day ?? (forecasts.length ? forecasts.reduce((a: any, b: any) => (Number(b?.predicted_demand||0) < Number(a?.predicted_demand||0) ? b : a), forecasts[0]) : undefined);
  const peakNorm = peak ? { ...peak, day_of_week: peak.day_of_week ?? (peak.date ? dayOfWeek(peak.date) : undefined) } : undefined;
  const minNorm = min ? { ...min, day_of_week: min.day_of_week ?? (min.date ? dayOfWeek(min.date) : undefined) } : undefined;
  const first = forecasts[0]?.predicted_demand ?? 0;
  const last = forecasts[forecasts.length - 1]?.predicted_demand ?? 0;
  const trend = data?.trend ?? (last > first ? 'increasing' : last < first ? 'decreasing' : 'stable');
  const trend_strength = typeof data?.trend_strength === 'number' ? data.trend_strength : (denom > 0 ? Math.min(1, Math.abs(last - first) / Math.max(1, avg)) : 0);
  const forecast_days = data?.forecast_days ?? data?.horizon_days ?? forecasts.length;
  const generated_at = data?.generated_at ?? new Date().toISOString();
  return { ...data, forecasts, total_predicted_demand: total, average_daily_demand: avg, peak_demand_day: peakNorm, min_demand_day: minNorm, low_demand_day: minNorm, trend, trend_strength, forecast_days, generated_at };
}

router.get('/ml/status', async (_req: Request, res: Response) => {
  try {
    const r = await axios.get(`${ML_URL}/ml/status`);
    res.json(r.data);
  } catch (err: any) {
    res.status(503).json({ detail: 'ML service unavailable', error: err?.message });
  }
});

router.get('/ml/health', async (_req: Request, res: Response) => {
  try {
    const r = await axios.get(`${ML_URL}/ml/health`);
    res.json(r.data);
  } catch (err: any) {
    res.status(503).json({ status: 'unhealthy', ml_system_available: false, error: err?.message });
  }
});

router.get('/ml/demand-forecast', async (req: Request, res: Response) => {
  try {
    const payload = normalizeForecastPayload(req);
    const r = await axios.post(`${ML_URL}/ml/demand-forecast`, payload);
    res.json(normalizeForecastResponse(r.data));
  } catch (err: any) {
    if (FALLBACK_ON_ERROR) {
      const payload = normalizeForecastPayload(req);
      return res.json(normalizeForecastResponse(buildForecastFallback(payload)));
    }
    const status = err?.response?.status || 500;
    res.status(status).json({ detail: 'Failed to get forecast (GET)', error: err?.message, from: 'node-proxy' });
  }
});

router.post('/ml/demand-forecast', async (req: Request, res: Response) => {
  try {
    const payload = normalizeForecastPayload(req);
    const r = await axios.post(`${ML_URL}/ml/demand-forecast`, payload);
    res.json(normalizeForecastResponse(r.data));
  } catch (err: any) {
    if (FALLBACK_ON_ERROR) {
      const payload = normalizeForecastPayload(req);
      return res.json(normalizeForecastResponse(buildForecastFallback(payload)));
    }
    const status = err?.response?.status || 500;
    res.status(status).json({ detail: 'Failed to get forecast', error: err?.message });
  }
});

router.post('/ml/demand-forecast/bulk', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${ML_URL}/ml/demand-forecast`, req.body);
    res.json(r.data);
  } catch (err: any) {
    const status = err?.response?.status || 500;
    res.status(status).json({ detail: 'Failed to get bulk forecast', error: err?.message });
  }
});

router.post('/ml/anomaly-detection', async (req: Request, res: Response) => {
  try {
    const r = await axios.post(`${ML_URL}/ml/anomaly-detection`, req.body);
    res.json(r.data);
  } catch (err: any) {
    const status = err?.response?.status || 500;
    res.status(status).json({ detail: 'Failed to run anomaly detection', error: err?.message });
  }
});

router.get('/ml/anomaly-detection/summary', async (_req: Request, res: Response) => {
  res.status(501).json({ detail: 'Not implemented' });
});
