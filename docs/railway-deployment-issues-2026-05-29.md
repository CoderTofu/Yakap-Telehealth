# Railway Deployment Issues and Resolutions (2026-05-29)

This document records what failed during Railway deployment, why it failed, and the exact fix applied.

## Final Topology

- frontend service: `frontend`
- backend service: `backend`
- database service: `Postgres`
- environment: `production`

## Issue 1: Backend migration failed with missing SQL file

### Symptom

Build/deploy path failed while trying to open `/docker/init.sql`.

### Root cause

The backend service image was built from `backend/` context and did not contain repository-root path `/docker/init.sql`.

### Fix

- created backend-local schema file: `backend/sql/init.sql`
- updated `backend/scripts/db-migrate.js` to read local schema when `DATABASE_URL` is present
- updated `backend/Dockerfile.railway` to include `COPY sql ./sql`
- removed migration/seed execution from image build stage

## Issue 2: Frontend built but returned 502

### Symptom

Railway showed successful build, but browser returned `502 Bad Gateway`.

### Root cause

Frontend runtime binding/startup config did not match Railway runtime expectations.

### Fix

- ensured frontend start command binds host and port correctly for Railway
- validated frontend health through service logs and public domain checks

## Issue 3: Next rewrite config failed build

### Symptom

Build error: invalid rewrite when `NEXT_PUBLIC_API_URL` was not present at build time.

### Root cause

`next.config.ts` rewrite depended on build-time environment value.

### Fix

- removed rewrite from `frontend/next.config.ts`
- used explicit API base usage in app code via `NEXT_PUBLIC_API_URL`

## Issue 4: Migration/seed failed with internal database hostname

### Symptom

`railway run npm run db:bootstrap` failed with:

- `getaddrinfo ENOTFOUND postgres.railway.internal`

### Root cause

`railway run` executed on the local machine, where Railway private DNS hostnames do not resolve.

### Fix

Ran migration/seed inside Railway network through backend service:

```bash
railway ssh -s backend -e production -- npm run db:migrate
railway ssh -s backend -e production -- npm run db:seed
```

or:

```bash
railway ssh -s backend -e production -- npm run db:bootstrap
```

## Issue 5: Browser mixed-content and CORS failures

### Symptom

Browser blocked requests as mixed content and showed CORS errors.

Examples:

- `http://backend.railway.internal:4000/...` blocked on HTTPS frontend
- missing `Access-Control-Allow-Origin` in failing browser requests

### Root cause

Two configuration problems:

1. frontend production variable was set to internal HTTP host
2. backend CORS origin values had trailing slash mismatch in earlier config

### Fix

Set production variables to public HTTPS values and redeployed both services.

Frontend variable:

```bash
railway variable set NEXT_PUBLIC_API_URL=https://backend-production-8edc.up.railway.app --service frontendV2 --environment production
```

Backend variables:

```bash
railway variable set CORS_ORIGIN=https://frontendv2-production-e733.up.railway.app --service backend --environment production
railway variable set FRONTEND_URL=https://frontendv2-production-e733.up.railway.app --service backend --environment production
railway variable set NEXT_PUBLIC_SITE_URL=https://frontendv2-production-e733.up.railway.app --service backend --environment production
```

Redeploy:

```bash
railway redeploy --service frontend --environment production
railway redeploy --service backend --environment production
```

## Verified State

- backend health endpoint responds: `/health`
- CORS preflight passes for frontend origin against backend login route
- frontend production variable points to backend public HTTPS domain
- backend CORS variables match frontend origin without trailing slash

## Operational Notes

- seed script is destructive and truncates data before insert
- keep seed manual (or controlled one-off) rather than automatic per deploy
- use service-scoped deployment config (`backend/railway.toml`, `frontend/railway.toml`)

## Quick Recovery Playbook

1. Confirm frontend API variable
   - `railway variable list --service frontendV2 --environment production`
2. Confirm backend CORS values
   - `railway variable list --service backend --environment production`
3. Check backend logs
   - `railway logs --service backend --environment production --lines 120`
4. Check frontend logs
   - `railway logs --service frontendV2 --environment production --lines 120`
5. Validate CORS preflight
   - send OPTIONS request from frontend origin to backend endpoint
6. If DB needs re-bootstrap
   - run bootstrap through `railway ssh` on backend service
