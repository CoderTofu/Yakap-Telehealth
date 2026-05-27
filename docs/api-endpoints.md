# API Endpoints Reference

This document describes the API endpoints currently implemented in `apps/api/src`, including:

- request parameters
- authentication and role rules
- expected usage in the app flows

Base path: `/api/v1`

## Conventions

- Protected endpoints require header: `Authorization: Bearer <token>`
- Success responses use `{ "data": ... }`
- Errors use `{ "error": { "message": "..." } }`
- Roles: `patient`, `doctor`

## Health

### GET `/health`

Purpose:

- Basic API liveness check.

Auth:

- Public.

Response:

- `{ status: "ok", timestamp: string }`

App usage:

- Dev/ops checks and quick environment validation.

## Auth Module

### POST `/auth/login`

Purpose:

- Authenticate user and issue JWT.

Body:

- `email` (string, required)
- `password` (string, required)

Response data:

- `token`
- `user` (`id`, `email`, `name`, `role`)

App usage:

- Used by web login page to store token and user info, then route by role:
  - patient -> patient dashboard
  - doctor -> doctor dashboard

### POST `/auth/register`

Purpose:

- Register patient or doctor account, create profile row, issue JWT.

Body common fields:

- `email` (string, required)
- `password` (string, required)
- `role` (`patient` | `doctor`, required)
- `name` (string, required)
- `phone` (string, required)
- `avatar_url` (string | null, optional)

Body when role is patient:

- `patient_profile.date_of_birth` (string | null)
- `patient_profile.weight_kg` (number | null)
- `patient_profile.height_cm` (number | null)
- `patient_profile.medical_history` (string | null)

Body when role is doctor:

- `doctor_profile.specialization` (string, required)
- `doctor_profile.license_number` (string, required)
- `doctor_profile.bio` (string | null)
- `doctor_profile.years_exp` (number | null)
- `doctor_profile.consultation_fee` (number | null)

Response data:

- `token`
- `user`

App usage:

- Used by web register page, then routes to role dashboard.

### GET `/auth/me`

Purpose:

- Return authenticated user context from token.

Auth:

- Required.

Response data:

- User object (`id`, `email`, `name`, `role`).

App usage:

- Useful for session bootstrap and token validation on app load.

## Doctors Module

### GET `/doctors`

Purpose:

- Public doctor discovery list.

Query params:

- `specialization` (string, optional)
- `search` (string, optional; matches doctor name/specialization)
- `page` (number, optional, default `1`)
- `limit` (number, optional, default `12`, max `100`)

Response data:

- `items`: doctor summaries
- `pagination`: `page`, `limit`, `total`, `total_pages`

App usage:

- Patient discovery page (doctor card grid, filters, search).

### GET `/doctors/:id`

Purpose:

- Fetch detailed doctor profile.

Path params:

- `id` (doctor user id)

Response data includes:

- identity/contact + doctor profile fields (specialization, bio, years, fee, etc.)

App usage:

- Patient doctor detail page before booking.

### GET `/doctors/:id/availability`

Purpose:

- Return computed available slots.

Path params:

- `id` (doctor user id)

Query params:

- `from` (ISO datetime, optional)
- `to` (ISO datetime, optional)

Notes:

- If omitted, defaults to a 7-day window from now.
- Slots are generated from weekly schedule, then blocked by:
  - one-off schedule blocks
  - pending/confirmed appointments

Response data:

- `doctor_id`, `from`, `to`, `slots[]` (`starts_at`, `ends_at`)

App usage:

- Booking flow slot picker and calendar view.

### GET `/doctors/me/schedule`

Purpose:

- Doctor reads own weekly schedule and one-off blocks.

Auth/role:

- Doctor only.

Response data:

- `weekly[]` (`day_of_week`, `start_time`, `end_time`, `is_blocked`)
- `blocks[]` (`id`, `starts_at`, `ends_at`, `reason`)

App usage:

- Doctor schedule management screen.

### PUT `/doctors/me/schedule`

Purpose:

- Replace doctor weekly schedule in bulk.

Auth/role:

- Doctor only.

Body:

- `schedules` (non-empty array, required)
  - item:
    - `day_of_week` (0..6)
    - `start_time` (`HH:MM`)
    - `end_time` (`HH:MM`, must be later than start)

Behavior:

- Existing rows are deleted, then new rows inserted in a transaction.

App usage:

- Save weekly clinic hours.

### POST `/doctors/me/blocks`

Purpose:

- Create one-off unavailable time block.

Auth/role:

- Doctor only.

Supported body formats:

- Preferred:
  - `starts_at` (ISO datetime)
  - `ends_at` (ISO datetime)
  - `reason` (string, optional)
- Backward-compatible:
  - `date` (`YYYY-MM-DD`)
  - `start_time` (`HH:MM`)
  - `end_time` (`HH:MM`)
  - `reason` (optional)

Rules:

- end must be after start
- cannot block over pending/confirmed appointment times

App usage:

- Doctor calendar block action.

### GET `/doctors/me/patients`

Purpose:

- List patients this doctor has treated/engaged with.

Auth/role:

- Doctor only.

Eligibility logic:

- Patients with doctor appointments in `confirmed` or `completed`.

App usage:

- Doctor patient list page.

### GET `/doctors/me/patients/:patientId`

Purpose:

- Fetch patient profile details for a doctor-owned patient relationship.

Auth/role:

- Doctor only.

Path params:

- `patientId`

Access rule:

- Allowed only if doctor has `confirmed` or `completed` appointment with that patient.

App usage:

- Doctor patient detail/profile panel.

## Appointments Module

### POST `/appointments`

Purpose:

- Patient books appointment request.

Auth/role:

- Patient only.

Body:

- `doctor_id` (string, required)
- `scheduled_at` (ISO datetime, required)
- `duration_minutes` (number, optional, default `30`)

Validation rules:

- doctor exists
- slot is inside doctor weekly schedule
- slot is not in doctor one-off block
- slot does not overlap pending/confirmed appointment

Behavior:

- Creates appointment with `status = pending`
- Creates notifications for doctor and patient

App usage:

- Patient booking confirmation step.

### GET `/appointments/me`

Purpose:

- List own appointments for either role.

Auth:

- Required.

Behavior:

- patient -> rows where `patient_id = me`
- doctor -> rows where `doctor_id = me`

Response includes:

- status timeline fields (`approved_at`, `rejected_at`, `cancelled_at`, `completed_at`)
- `video_room_url` (used for calendar link here)

App usage:

- Patient appointments page and doctor appointments dashboard.

### PATCH `/appointments/:id/decision`

Purpose:

- Doctor approves or rejects pending appointment.

Auth/role:

- Doctor only.

Path params:

- `id` (appointment id)

Body:

- `action` (`approve` | `reject`, required)
- `reason` (string, optional, used for rejection)

Rules:

- appointment must belong to doctor
- appointment status must be `pending`

Behavior:

- approve -> status `confirmed`, set `approved_at`, generate Google Calendar link
- reject -> status `cancelled`, set `rejected_at` and optional `rejection_reason`
- notification events emitted

App usage:

- Doctor review queue for incoming booking requests.

### PATCH `/appointments/:id/cancel`

Purpose:

- Cancel appointment by patient or doctor participant.

Auth:

- Required.

Path params:

- `id`

Body:

- `reason` (string, optional)

Rules:

- caller must be doctor or patient in appointment
- status must be `pending` or `confirmed`

Behavior:

- sets `status = cancelled`
- sets `cancelled_by`, `cancelled_at`
- emits notifications to both sides

App usage:

- Cancel action from appointment details/list.

### PATCH `/appointments/:id/complete`

Purpose:

- Doctor marks confirmed appointment as completed.

Auth/role:

- Doctor only.

Path params:

- `id`

Rules:

- appointment must belong to doctor
- current status must be `confirmed`
- current time must be after scheduled end (`scheduled_at + duration_minutes`)

Behavior:

- sets `status = completed`, `completed_at`
- emits notifications

App usage:

- Doctor post-consult action.

## Consultation Notes (nested under appointments)

### POST `/appointments/:id/notes`

Purpose:

- Doctor creates consultation note for completed appointment.

Auth/role:

- Doctor only.

Body:

- `subjective` (string, optional)
- `diagnosis` (string, optional)
- `prescription` (string, optional)

Rules:

- appointment belongs to doctor
- appointment status is `completed`

Behavior:

- inserts note row
- notifies patient

App usage:

- Doctor writes post-consult notes.

### GET `/appointments/:id/notes`

Purpose:

- Read notes for an appointment.

Auth:

- Required.

Access:

- doctor or patient participant of appointment.

App usage:

- Doctor note history and patient record detail.

### PATCH `/appointments/:id/notes/:noteId`

Purpose:

- Doctor updates their own note.

Auth/role:

- Doctor only.

Body:

- any subset of `subjective`, `diagnosis`, `prescription`

App usage:

- Doctor edits note after follow-up.

### DELETE `/appointments/:id/notes/:noteId`

Purpose:

- Doctor deletes their own note.

Auth/role:

- Doctor only.

Response:

- `204 No Content` on success.

App usage:

- Rare correction/removal flow for doctor notes.

## Profile Module

### GET `/profile/me`

Purpose:

- Return current user profile + role-specific profile section.

Auth:

- Required.

Response:

- base user fields +
  - `patient_profile` for patients
  - `doctor_profile` for doctors

App usage:

- Profile screen initial load.

### PATCH `/profile/me`

Purpose:

- Update own base and role-specific profile fields.

Auth:

- Required.

Body:

- top-level: `name`, `phone`, `avatar_url`
- patient role: `patient_profile` fields
- doctor role: `doctor_profile` fields

Notes:

- doctor specialization is validated against allowed values
- upsert behavior for role profile tables

App usage:

- Profile edit forms for both roles.

## Patients Module

### GET `/patients/me/records`

Purpose:

- Get patient medical records sourced from consultation notes.

Auth/role:

- Patient only.

Response includes:

- note fields + related appointment date + doctor identity/specialization

App usage:

- Patient medical records/history page.

## Notifications Module

### GET `/notifications/me`

Purpose:

- List current user notifications.

Auth:

- Required.

App usage:

- Notifications page for both roles.

### PATCH `/notifications/:id/read`

Purpose:

- Mark one notification as read.

Auth:

- Required.

Path params:

- `id` notification id

Rule:

- only owner can update (scoped by `user_id = me`)

App usage:

- Mark-as-read in notification list.

## Appointment Status Lifecycle Implemented

- `pending` -> created by patient booking
- `pending` -> `confirmed` by doctor approval
- `pending` -> `cancelled` by doctor rejection or participant cancellation
- `confirmed` -> `cancelled` by participant cancellation
- `confirmed` -> `completed` by doctor after end-time

## How endpoints are currently used in the web app

Current direct API usage in web pages:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`

Current frontend state for the rest:

- Dashboard/appointments/doctors views still rely on local mock data in `apps/web/src/lib/dashboard-data.ts`.

Planned integration map:

- Patient doctor discovery page -> `GET /doctors`
- Patient doctor detail + slot picker -> `GET /doctors/:id`, `GET /doctors/:id/availability`
- Patient booking -> `POST /appointments`
- Patient appointments -> `GET /appointments/me`, `PATCH /appointments/:id/cancel`
- Patient records -> `GET /patients/me/records`, `GET /appointments/:id/notes`
- Doctor schedule management -> `GET /doctors/me/schedule`, `PUT /doctors/me/schedule`, `POST /doctors/me/blocks`
- Doctor appointment triage -> `GET /appointments/me`, `PATCH /appointments/:id/decision`
- Doctor completion + notes -> `PATCH /appointments/:id/complete`, notes CRUD endpoints
- Shared profile pages -> `GET /profile/me`, `PATCH /profile/me`
- Notifications pages -> `GET /notifications/me`, `PATCH /notifications/:id/read`

## Quick Auth Example

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maya.santos@example.com","password":"password123"}'
```

Use token for protected endpoints:

```bash
curl http://localhost:4000/api/v1/appointments/me \
  -H "Authorization: Bearer <token>"
```
