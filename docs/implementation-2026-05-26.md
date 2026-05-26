# Implementation Notes - 2026-05-26

This document summarizes the frontend and backend logic built and refactored for May 26, 2026.

## Frontend Logic

### Register flow

File: [apps/web/src/app/register/page.tsx](../apps/web/src/app/register/page.tsx)

The register page is a three-step form.

1. Pick a role: `patient` or `doctor`.
2. Enter base account details: full name, email, password, confirm password, and phone number.
3. Enter role-specific details:
   - Patient: date of birth, weight, height, medical history
   - Doctor: specialization, license number, years of experience, bio

Behavior built today:

- Specialization is restricted to the allowed list from [apps/web/src/lib/appConfig.tsx](../apps/web/src/lib/appConfig.tsx).
- The doctor years-of-experience field stays controlled as a string while typing and is converted only when building the payload.
- The form validates required fields before sending the request.
- On success, it stores `authToken` and `authUser` in `localStorage`.
- On success, it redirects to the role dashboard:
  - Doctors -> `/doctor/dashboard`
  - Patients -> `/patient/dashboard`

### Login flow

File: [apps/web/src/app/login/page.tsx](../apps/web/src/app/login/page.tsx)

The login form now submits email and password to the API.

Behavior built today:

- Validates email and password before sending the request.
- Calls `POST /api/v1/auth/login` using `NEXT_PUBLIC_API_URL`.
- Stores `authToken` and `authUser` in `localStorage` on success.
- Redirects by role:
  - Patients -> `/patient/dashboard`
  - Doctors -> `/doctor/dashboard`
- Includes inline error handling and a loading state.

### Shared shell and dashboards

Files:

- [apps/web/src/components/shared/app-shell.tsx](../apps/web/src/components/shared/app-shell.tsx)
- [apps/web/src/app/patient/dashboard/page.tsx](../apps/web/src/app/patient/dashboard/page.tsx)
- [apps/web/src/app/doctor/dashboard/page.tsx](../apps/web/src/app/doctor/dashboard/page.tsx)

The copied TanStack Router shell was converted into a Next-compatible client component.

Behavior built today:

- Uses `next/link` and `next/navigation` instead of TanStack Router hooks.
- Accepts a local user object, nav items, unread count, and logout callback.
- Derives the active title from the current pathname.
- Highlights the active sidebar route.
- Renders profile and notification shortcuts in the header.

The patient and doctor dashboards now use that shell and local demo data so they can render without missing mock/auth modules.

### Shared UI and data helpers

Files:

- [apps/web/src/components/shared/avatar.tsx](../apps/web/src/components/shared/avatar.tsx)
- [apps/web/src/components/shared/status-badge.tsx](../apps/web/src/components/shared/status-badge.tsx)
- [apps/web/src/lib/dashboard-data.ts](../apps/web/src/lib/dashboard-data.ts)
- [apps/web/src/lib/appConfig.tsx](../apps/web/src/lib/appConfig.tsx)

What they do:

- `YakapAvatar` renders initials inside a colored circle.
- `StatusBadge` maps appointment statuses to labels and colors.
- `dashboard-data.ts` provides local demo patients, doctors, appointments, and formatting helpers.
- `appConfig.tsx` defines the canonical specialty list and initials helper.

## Backend Logic

### Auth endpoints

Files:

- [apps/api/src/controllers/auth.ts](../apps/api/src/controllers/auth.ts)
- [apps/api/src/services/auth.ts](../apps/api/src/services/auth.ts)
- [apps/api/src/routes/auth.ts](../apps/api/src/routes/auth.ts)
- [apps/api/src/index.ts](../apps/api/src/index.ts)

The API exposes:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`

Login logic:

- Requires email and password.
- Looks up the user by email.
- Verifies the password with bcrypt.
- Returns a signed JWT and the user payload.

Register logic:

- Requires email, password, role, name, and phone.
- Validates the role against the exact allowed list.
- Requires doctor-specific fields when the role is `doctor`.
- Validates doctor specialization against the allowed list.
- Hashes the password before inserting the user.
- Inserts the base user row and the role-specific profile row in a transaction.
- Returns the JWT and user payload after creation.

`me` logic:

- Returns the authenticated user from the request context.
- Sends `401` if no user is attached.

### Auth middleware

File: [apps/api/src/middleware/auth.ts](../apps/api/src/middleware/auth.ts)

The middleware verifies bearer tokens, decodes the JWT, and attaches the authenticated user to `req.user`.

### Canonical constants

File: [apps/api/src/constants.ts](../apps/api/src/constants.ts)

The API now owns the canonical allowed lists for:

- `role`: `patient`, `doctor`
- `specialization`: the exact specialization values used in the UI and SQL schema

## Database Logic

Files:

- [docker/init.sql](../docker/init.sql)
- [apps/api/src/db/seed.ts](../apps/api/src/db/seed.ts)
- [docs/database.md](../docs/database.md)

Database behavior built today:

- `users.role` is restricted to `patient` or `doctor`.
- `doctor_profiles.specialization` is restricted to the allowed specialization list.
- The seed script uses the same allowed values and inserts demo rows in dependency order.
- The schema and seed data intentionally use the same exact lowercase values as the API and UI.

## Important Notes

- The frontend dashboards currently use local demo data so they can render without the missing mock modules from the copied code.
- `packages/shared` was removed, so the workspace no longer depends on a `packages/` folder.
- The project now keeps logic in app-local files such as [apps/api/src/constants.ts](../apps/api/src/constants.ts) and [apps/web/src/lib/appConfig.tsx](../apps/web/src/lib/appConfig.tsx).

## Verification

Type-checks passed after the refactor:

- `npm run type-check --workspace=apps/web`
- `npm run type-check --workspace=apps/api`

## Role-based access control (server + client)

Files added/changed:

- [apps/web/src/lib/auth.ts](../apps/web/src/lib/auth.ts): server-side helper which reads an `authUser` cookie (JSON) via `next/headers` and exposes `getCurrentUser()` for server components/layouts.
- [apps/web/src/app/doctor/layout.tsx](../apps/web/src/app/doctor/layout.tsx): server `layout.tsx` that calls `getCurrentUser()` and redirects to `/login` when the user is missing or not a `doctor`.
- [apps/web/src/app/patient/layout.tsx](../apps/web/src/app/patient/layout.tsx): server `layout.tsx` that calls `getCurrentUser()` and redirects to `/login` when the user is missing or not a `patient`.
- [apps/web/src/app/login/page.tsx](../apps/web/src/app/login/page.tsx): mirrors `authToken` and `authUser` into document cookies on successful login (in addition to `localStorage`) so server layouts can read role on first render.
- [apps/web/src/app/register/page.tsx](../apps/web/src/app/register/page.tsx): same cookie-mirroring on successful registration.
- [apps/web/src/app/doctor/dashboard/page.tsx](../apps/web/src/app/doctor/dashboard/page.tsx): client fix — dashboard now reads `authUser` from `localStorage` in the client, adds a loading guard, and clears cookies on logout.

Notes and rationale:

- Server-side enforcement is primary: `layout.tsx` files intercept render for their route groups and redirect unauthorized users. This prevents direct URL access by the wrong role.
- Client-side `localStorage` usage remains for UX; however, client checks are not relied on for security.
- The current cookie-sync uses non-HttpOnly cookies set in the browser to make the user payload available to server components via `next/headers` for immediate redirects. Recommended next step: move cookie-setting into server API responses with `Set-Cookie` and use HttpOnly cookies for improved security.

Next recommended tasks:

- Replace client-set cookies with server-set HttpOnly `Set-Cookie` on the API login/register endpoints.
- Add API middleware `requireRole(role)` to protect API routes server-side (e.g., `/api/v1/appointments/doctor/*`).
- Hide/show navigation links client-side by reading `authUser` from `localStorage` or `/api/v1/auth/me`.

