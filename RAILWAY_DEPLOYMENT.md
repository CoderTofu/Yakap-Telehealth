# Railway Deployment

This project is deployed on Railway as three services in one project:

- Postgres service (managed image)
- backend service (from `backend/`)
- frontend service (from `frontend/`)

## Service Config Files

- `backend/railway.toml`
- `frontend/railway.toml`
- `docker/railway.toml`

Both app services use Dockerfile mode and service-local Dockerfiles:

- backend: `backend/Dockerfile.railway`
- frontend: `frontend/Dockerfile.railway`

## Deployment Order

1. Deploy Postgres
2. Deploy backend
3. Deploy frontend

## Required Variables

### backend service

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `PORT=4000`
- `NODE_ENV=production`
- `JWT_SECRET=<your-secret>`
- `GEMINI_API_KEY=<your-key>`
- `CORS_ORIGIN=https://frontendv2-production-e733.up.railway.app`
- `FRONTEND_URL=https://frontendv2-production-e733.up.railway.app`
- `NEXT_PUBLIC_SITE_URL=https://frontendv2-production-e733.up.railway.app`

Important: do not include trailing slashes for the frontend origin values above.

### frontend service

- `NEXT_PUBLIC_API_URL=https://backend-production-8edc.up.railway.app`

Do not set `NEXT_PUBLIC_API_URL` to `http://backend.railway.internal:4000` for browser clients.

## Database Migration and Seed

The migration and seed scripts are designed to run from inside the backend service network.

From `backend/`:

```bash
railway ssh -s backend -e production -- npm run db:migrate
railway ssh -s backend -e production -- npm run db:seed
```

Or one-time bootstrap:

```bash
railway ssh -s backend -e production -- npm run db:bootstrap
```

Why this is required:

- `railway run ...` executes on your local machine with injected env vars.
- private hosts like `postgres.railway.internal` do not resolve from local machines.
- `railway ssh ...` runs inside Railway where the private DB host resolves.

## Useful Operational Commands

```bash
railway status --json
railway logs --service backend --environment production --lines 120
railway logs --service frontendV2 --environment production --lines 120
railway variable list --service backend --environment production
railway variable list --service frontendV2 --environment production
```

## Validation Checklist

- backend health endpoint returns 200 on `/health`
- frontend can log in without CORS or mixed-content errors
- browser requests target `https://backend-production-8edc.up.railway.app`
- preflight response includes `Access-Control-Allow-Origin: https://frontendv2-production-e733.up.railway.app`

## Reference

See `docs/railway-deployment-issues-2026-05-29.md` for a detailed issue timeline and fixes applied.
