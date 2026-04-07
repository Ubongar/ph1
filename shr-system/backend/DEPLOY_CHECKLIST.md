# Backend Deployment Checklist (Render or Railway)

Use this checklist to deploy the SHR backend API in production.

## 1) Prepare Repository

- Confirm backend entrypoint exists: backend/server.js
- Confirm health endpoint works locally: GET /api/health
- Keep backend data storage note in mind: current file-based storage is not durable on ephemeral hosts

## 2) Set Required Environment Variables

Set these on Render or Railway:

- PORT=8787
- SHR_SYNC_TOKEN_SECRET=<long-random-secret>
- SHR_SYNC_TOKEN_TTL_SECONDS=3600

Do not commit real secrets.

## 3) Deploy Backend

### Render

- Create a new Web Service from this repo
- Set Root Directory to shr-system
- Render can read render.yaml in shr-system
- Verify settings:
  - Build Command: npm install
  - Start Command: node backend/server.js
  - Health Check Path: /api/health

### Railway

- Create a new service from this repo
- Set Root Directory to shr-system
- Railway will use railway.json in shr-system
- Verify Start Command: node backend/server.js

## 4) Verify Backend is Live

- Open: https://<your-backend-domain>/api/health
- Expect JSON with ok=true

## 5) Connect Frontend (Vercel)

Set Vercel environment variable for the frontend project:

- VITE_API_BASE_URL=https://<your-backend-domain>/api

Redeploy frontend after adding this variable.

## 6) Production Smoke Test

- Login as admin in app
- Open Reconciliation Center
- Run Sync Now
- Resolve one conflict
- Open Admin Server Audit Trail page and confirm resolution log appears

## 7) Hardening Follow-ups

- Replace JSON file storage with Postgres for durable state
- Add request rate limiting and stricter CORS controls
- Rotate SHR_SYNC_TOKEN_SECRET regularly
