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

## Endpoints (initial)
- GET /equipment
- POST /equipment

## Next
- Port Rentals, Sites, Operators
- Analytics parity and anomaly detection
- Auth (if needed)
