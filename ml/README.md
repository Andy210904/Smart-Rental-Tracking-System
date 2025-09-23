# Smart Rental Tracker ML Service

This directory contains the machine learning components of the Smart Rental Tracking system.

## Overview

The ML service provides:

- Demand forecasting
- Anomaly detection
- Equipment statistics and analytics
- Model training capabilities

## Architecture

There are two ways to use the ML service:

1. **Through Node.js Backend** - Backend-to-backend communication
2. **Direct from Frontend** - Frontend calls ML API directly (newer approach)

## Available Services

### 1. Simple ML Service (Direct Frontend Access)

This service is designed to be called directly from the frontend, bypassing the Node.js backend.

```
start_direct_ml_service.bat
```

**API Endpoints:**

- `GET /ml/health` - Check service health
- `POST /ml/demand-forecast` - Get demand forecasts
- `POST /ml/anomaly-detection` - Get equipment anomalies
- `GET /ml/equipment-stats` - Get equipment statistics

### 2. FastAPI ML Service (Backend Access)

Traditional service accessed via Node.js backend.

```
start_ml_service.bat
```

## Requirements

All required packages are listed in `requirements.txt`

```
pip install -r requirements.txt
```

## Running the Service

For direct frontend access:

```
./start_direct_ml_service.bat  # Windows
```

For traditional backend-to-backend setup:

```
./start_ml_service.bat  # Windows
```

## Configuration

The ML service runs on port 8001 by default. 

CORS is configured to allow requests from:
- http://localhost:3000 (Node.js API)
- http://localhost:3001 (Alternative Node.js API port)
- http://localhost:4000 (Next.js frontend)
- https://cat-v7yf.onrender.com (Production backend)
