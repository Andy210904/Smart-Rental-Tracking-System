# Smart Rental Tracker Frontend

This directory contains the Next.js frontend application for the Smart Rental Tracking system.

## Direct ML API Integration

The frontend now has direct integration with the ML API service, bypassing the Node.js backend for ML-related functionality.

### ML API Service

A dedicated service for ML API requests has been created:

```typescript
// lib/mlApiDirect.ts
```

This service provides direct access to the Python ML service for:
- Demand forecasting
- Anomaly detection 
- Equipment statistics

### Components Using Direct API

The following components have been updated to use the direct ML API:

1. **DemandForecast.tsx** - Makes direct API calls to `/ml/demand-forecast`
2. **AnomalyAlerts.tsx** - Makes direct API calls to `/ml/anomaly-detection`
3. **EquipmentStats.tsx** - Makes direct API calls to `/ml/equipment-stats`

### Fallback Mechanism

All components include fallback logic to use the Node.js backend API when the ML service is not available:

1. Health check is performed to check ML service availability
2. If ML service is unavailable, the component falls back to using the Node.js API
3. Error handling provides appropriate user feedback

## Environment Configuration

Configure the ML API URL in `.env.local`:

```
NEXT_PUBLIC_ML_API_URL=http://localhost:8001
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Running the Application

Make sure both the ML service and Node.js backend are running:

```bash
# Start the frontend
npm run dev

# In another terminal, start the ML service
cd ../ml
./start_direct_ml_service.bat

# In another terminal, start the Node.js backend (fallback)
cd ../backend-node
npm run dev
```