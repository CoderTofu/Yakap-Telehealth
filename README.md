# Yakap Monorepo

## Stack

- **Web**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **API**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker, Docker Compose

## Structure

```
yakap/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Express backend (port 4000)
├── packages/
│   └── shared/       # Shared types
├── docker/           # Docker init scripts
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
npm run docker:up
```

### 3. Copy environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4. Run development servers

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- API Health: http://localhost:4000/health

### 5. Seed sample data

```bash
npm run db:seed
```

If you already started Postgres before the schema update and want a clean reset, run:

```bash
docker compose down -v
npm run docker:up
npm run db:seed
```

### 6. View the database in DBeaver

Create a new PostgreSQL connection with these values:

- Host: `localhost`
- Port: `5000`
- Database: `yakap_db`
- Username: `yakap`
- Password: `yakap_dev`

After connecting, expand `Schemas > public > Tables` to browse `users`, `patient_profiles`, `doctor_profiles`, `doctor_schedules`, `appointments`, `consultation_notes`, and `notifications`.

## Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Run web + api concurrently  |
| `npm run dev:web`     | Run web only                |
| `npm run dev:api`     | Run API only                |
| `npm run docker:up`   | Start PostgreSQL container  |
| `npm run docker:down` | Stop containers             |
| `npm run docker:logs` | Tail container logs         |
| `npm run db:migrate`  | Run DB migrations           |
| `npm run db:seed`     | Seed sample telehealth data |
| `npm run build`       | Build all apps              |
| `npm run type-check`  | TypeScript check all        |
