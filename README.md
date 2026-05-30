# Yakap Telehealth Monorepo

Lightweight telehealth demo and reference implementation: a Next.js frontend, an Express API, and a PostgreSQL database packaged as a monorepo with npm workspaces.

## Live Demo

Try the demo (may be transient): https://frontend-production-3e53.up.railway.app/

## Stack (selected versions)

- Web: Next.js 16.x, React 19.x, TypeScript, Tailwind CSS
- API: Node.js (20+), Express, TypeScript
- Database: PostgreSQL 16
- Infrastructure: Docker, Docker Compose

These versions are pulled from package manifests in the `frontend` and `backend` packages.

## Repository layout

```
yakap/
├── frontend/         # Next.js frontend (port 3000)
├── backend/          # Express backend (port 4000)
├── docker/           # Docker init scripts and SQL
└── package.json      # root workspace scripts
```

## Quick Start (local development)

Prerequisites:
- Node.js 20+
- Docker Desktop (for local Postgres)

1) Install dependencies (root workspace):

```bash
npm install
```

2) Start the database (runs the Docker Compose stack defined at the repo root):

```bash
npm run docker:up
```


3) Configure environment variables

This repository does not include `.env.example` files. Create the following minimal env files before running the apps. Adjust values as needed.

backend/.env (example for local development using the Docker Postgres mapping):

```env
# Server
PORT=4000

# Local DB (when running Postgres via docker-compose on the host)
# Use port 5000 on the host which maps to container 5432
DATABASE_URL=postgresql://yakap:yakap_dev@localhost:5000/yakap_db

# CORS / allowed origins (comma separated)
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Optional public site url used by some endpoints
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

frontend/.env (example for local development):

```env
# Where the frontend should call the API in local dev
NEXT_PUBLIC_API_URL=http://localhost:4000
# Optional public site url
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes on DB URLs:
- When running the full Docker Compose stack, services connect internally using the `db` service host and container port 5432. Example internal URL used by the `api` service in `docker-compose.yml`:

```
postgresql://yakap:yakap_dev@db:5432/yakap_db
```

- When connecting from your host machine (pSQL client, DBeaver), use host `localhost` and port `5000` (host-to-container mapping), i.e.:

```
postgresql://yakap:yakap_dev@localhost:5000/yakap_db
```

4) Start development servers (runs frontend + backend concurrently):

```bash
npm run dev
```

Services:
- Web: http://localhost:3000
- API: http://localhost:4000
- API health: http://localhost:4000/health

5) Seed sample data (creates demo users, doctors, schedules, appointments):

```bash
npm run db:seed
```

6) Reset DB (if needed):

```bash
docker compose down -v
npm run docker:up
npm run db:seed
```

7) Inspect the database with a GUI (DBeaver, TablePlus):

Connection details (local Docker setup):
- Host: `localhost`
- Port: `5000`
- Database: `yakap_db`
- Username: `yakap`
- Password: `yakap_dev`

After connecting look under `Schemas > public > Tables` for `users`, `patient_profiles`, `doctor_profiles`, `doctor_schedules`, `appointments`, `consultation_notes`, and `notifications`.

## Helpful npm scripts (root)

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Run web + api concurrently  |
| `npm run dev:web`     | Run web only (frontend)     |
| `npm run dev:api`     | Run API only (backend)      |
| `npm run docker:up`   | Start Docker Compose (Postgres) |
| `npm run docker:down` | Stop containers             |
| `npm run docker:logs` | Tail container logs         |
| `npm run db:migrate`  | Run DB migrations (backend) |
| `npm run db:seed`     | Seed sample telehealth data |
| `npm run build`       | Build all apps              |
| `npm run type-check`  | TypeScript check for all workspaces |

