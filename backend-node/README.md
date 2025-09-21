# Smart Rental Tracker - Node Backend (WIP)

This is an incremental Node.js backend (Express + TypeScript + Prisma) for the Smart Rental Tracking System. It lives alongside the existing FastAPI backend to enable gradual migration.

## Tech Stack
- Express + TypeScript
- Prisma ORM (SQLite for local dev; can switch to Postgres via `DATABASE_URL`)
- Zod for request validation

## Getting Started
1. Install deps
```
npm install
```
2. Set env
```
cp .env .env.local # or edit .env
```
3. Generate DB and Prisma client
```
npm run prisma:migrate -- --name init
npm run prisma:generate
```
4. Dev server
```
npm run dev
```

Server runs on http://localhost:4000

## Seed sample data
You can populate the database with a realistic dataset (150+ equipment, 60+ rentals across active/completed/overdue, multiple sites and operators):

```
npm run seed
```

The seed is idempotent (uses upserts), so you can re-run it safely.

Quick verification from PowerShell:

```
(Invoke-RestMethod http://localhost:4000/equipment).Count
(Invoke-RestMethod http://localhost:4000/rentals).Count
```

## ML microservice integration
This backend proxies ML endpoints to a separate Python FastAPI service.

1) Start the Python service (in another terminal):
```
cd smart-rental-tracker\backend-ml-python
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py  # runs on http://localhost:8001
```

2) Configure Node to call it by setting `ML_SERVICE_URL` (default is http://localhost:8001):
```
# backend-node/.env
ML_SERVICE_URL=http://localhost:8001
```

3) Try endpoints via Node:
```
GET  http://localhost:4000/ml/status
POST http://localhost:4000/ml/demand-forecast
POST http://localhost:4000/ml/anomaly-detection
```

## Endpoints (initial)
- GET /equipment
- POST /equipment

## Next
- Completed: Equipment, Sites, Operators, Rentals basics, Dashboard basics
- Pending: Usage logs, Alerts, Advanced analytics, ML integration
