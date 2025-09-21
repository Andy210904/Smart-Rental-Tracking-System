from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

app = FastAPI(title="Smart Rental ML Service", version="0.1.0")

class ForecastRequest(BaseModel):
    site_id: Optional[str] = None
    equipment_type: Optional[str] = None
    horizon_days: int = 14

class ForecastItem(BaseModel):
    date: date
    predicted_demand: int
    confidence: float

class ForecastResponse(BaseModel):
    site_id: Optional[str] = None
    equipment_type: Optional[str] = None
    horizon_days: int
    forecast: List[ForecastItem]

class AnomalyPoint(BaseModel):
    equipment_id: str
    metric: str
    timestamp: str
    value: float

class AnomalyResponse(BaseModel):
    anomalies: List[AnomalyPoint]

@app.get("/ml/status")
def status():
    return {
        "models_loaded": True,
        "demand_forecasting": "available",
        "anomaly_detection": "available",
        "recommendations": "unavailable",
        "analytics": "available"
    }

@app.get("/ml/health")
def health():
    return {"status": "ok", "ml_system_available": True}

@app.post("/ml/demand-forecast", response_model=ForecastResponse)
def demand_forecast(req: ForecastRequest):
    # Placeholder: simple synthetic forecast
    from datetime import timedelta, date as dtdate
    today = dtdate.today()
    fc = []
    base = 5
    for i in range(req.horizon_days):
        d = today + timedelta(days=i+1)
        # simple seasonality-like curve
        predicted = int(base + (i % 7))
        conf = 0.7 + (i % 5) * 0.05
        if conf > 0.95:
            conf = 0.95
        fc.append(ForecastItem(date=d, predicted_demand=predicted, confidence=round(conf, 2)))
    return ForecastResponse(site_id=req.site_id, equipment_type=req.equipment_type, horizon_days=req.horizon_days, forecast=fc)

@app.post("/ml/anomaly-detection", response_model=AnomalyResponse)
def anomaly_detection(payload: dict):
    # Placeholder: emit a couple of synthetic anomalies if metrics present
    anomalies: List[AnomalyPoint] = []
    readings = payload.get("readings", [])
    for r in readings[:2]:
        anomalies.append(AnomalyPoint(
            equipment_id=str(r.get("equipment_id", "unknown")),
            metric=str(r.get("metric", "engine_hours")),
            timestamp=str(r.get("timestamp", "")),
            value=float(r.get("value", 0.0))
        ))
    return AnomalyResponse(anomalies=anomalies)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
