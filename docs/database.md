# Database

This app uses PostgreSQL in Docker. The schema is initialized from [docker/init.sql](../docker/init.sql), and sample rows are loaded by the API seed script.

## Connection Details

- Host: `localhost`
- Port: `5000`
- Database: `yakap_db`
- Username: `yakap`
- Password: `yakap_dev`

Inside Docker, the API talks to Postgres at `db:5432`.

## Start The Database

```bash
npm run docker:up
```

### Using `docker-compose.override.yml` for development

There is a `docker-compose.override.yml` provided for local development. The override file:

- Adds bind mounts so your workspace files inside `apps/` are visible to containers (no rebuild required for code changes).
- Runs the app in dev mode inside the container (e.g. `npm run dev`), enabling hot-reload or `ts-node-dev` restarts.

To start services using the override file (recommended for development):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

Notes:
- The override forwards ports and mounts project folders into containers. Use it when actively developing the API or web app.
- If you prefer a clean production-like start without mounts, run `npm run docker:up` which uses only `docker-compose.yml`.


This starts the `db` service from [docker-compose.yml](../docker-compose.yml).

## Schema Overview

The current schema is a small telehealth model:

- `users`: base account table for patients and doctors
- `patient_profiles`: patient-specific profile data
- `doctor_profiles`: doctor-specific profile data
- `doctor_schedules`: recurring availability and blocked time slots
- `appointments`: booked consultations between a patient and a doctor
- `consultation_notes`: clinical notes written after an appointment
- `notifications`: user-facing reminders and updates

## Canonical Constants

These values are intentionally duplicated in the app, API, and database layers so the UI, validation, and SQL all stay aligned.

### Roles

Current values: `patient`, `doctor`

If you add or replace a role, update all of these places:

- [apps/api/src/constants.ts](../apps/api/src/constants.ts) for API validation
- [apps/api/src/controllers/auth.ts](../apps/api/src/controllers/auth.ts) for registration checks
- [apps/web/src/app/register/page.tsx](../apps/web/src/app/register/page.tsx) for the role selector UI
- [docker/init.sql](../docker/init.sql) for the SQL `CHECK` constraint
- [apps/api/src/db/seed.ts](../apps/api/src/db/seed.ts) for seeded rows

### Specializations

Current values: `cardiology`, `dermatology`, `pediatrics`, `neurology`, `orthopedics`, `psychiatry`, `general medicine`, `ophthalmology`, `dentistry`, `gynecology`

If you add or replace a specialization, update all of these places:

- [apps/api/src/constants.ts](../apps/api/src/constants.ts) for API validation
- [apps/web/src/components/shared/appConfig.tsx](../apps/web/src/components/shared/appConfig.tsx) for the display label and icon list
- [apps/web/src/app/register/page.tsx](../apps/web/src/app/register/page.tsx) if the form needs different behavior
- [docker/init.sql](../docker/init.sql) for the SQL `CHECK` constraint
- [apps/api/src/db/seed.ts](../apps/api/src/db/seed.ts) for seeded doctor profiles

Both `role` and `specialization` are case-sensitive in the SQL constraints and the API checks, so use the exact lowercase values above when inserting rows directly.

## Table Details

### `users`

Core account data for both roles.

- `id` UUID primary key
- `email` unique
- `password_hash`
- `role` must be exactly `patient` or `doctor` when inserted directly into the database
- `name`, `phone`, `avatar_url`
- `created_at`

### `patient_profiles`

One row per patient user.

- `date_of_birth`
- `weight_kg`
- `height_cm`
- `medical_history`

### `doctor_profiles`

One row per doctor user.

- `specialization` must be one of: `cardiology`, `dermatology`, `pediatrics`, `neurology`, `orthopedics`, `psychiatry`, `general medicine`, `ophthalmology`, `dentistry`, `gynecology`
- `license_number` unique
- `bio`
- `years_exp`
- `consultation_fee`

Both `role` and `specialization` are case-sensitive in the raw SQL schema checks, so direct inserts must use the exact lowercase values above.

### `doctor_schedules`

Weekly availability rows.

- `day_of_week` is `0` to `6`
- `start_time` / `end_time`
- `is_blocked` marks unavailable slots

### `appointments`

Consultation booking records.

- `status` is `pending`, `confirmed`, `cancelled`, or `completed`
- optional `video_room_url`

### `consultation_notes`

Clinical notes tied to a completed appointment.

### `notifications`

Simple user notifications with `is_read` tracking.

## Bootstrap And Seed Flow

### Schema bootstrap

The `db:migrate` script runs the SQL in [docker/init.sql](../docker/init.sql) inside the running `db` container.

```bash
npm run db:migrate --workspace=apps/api
```

This is the current schema bootstrap step.

### Seed data

The `db:seed` script is a TypeScript runner in [apps/api/src/db/seed.ts](../apps/api/src/db/seed.ts).

```bash
npm run db:seed --workspace=apps/api
```

It:

1. Builds SQL in memory
2. Ensures the schema exists
3. Clears the telehealth tables in dependency order
4. Inserts demo users, profiles, schedules, appointments, notes, and notifications
5. Pipes the SQL into `psql` through `docker compose exec`

## Sample Data

The current seed creates:

- 4 users
- 2 patients
- 2 doctors
- 2 patient profiles
- 2 doctor profiles
- 4 schedule rows
- 3 appointments
- 1 consultation note
- 3 notifications

Seeded passwords are hashed with PostgreSQL `crypt(..., gen_salt('bf'))`.

## Resetting Local State

If you want a fresh database, run:

```bash
docker compose down -v
npm run docker:up
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api
```

## Troubleshooting

- If `db:seed` fails, make sure the `db` container is running.
- If the port is already in use, stop the old Postgres container before starting a new one.
- If you changed `.env`, restart the API so it picks up the new database credentials.
