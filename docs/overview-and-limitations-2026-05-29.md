# Overview of the Code and Technical Limitations — 2026-05-29

## Overview of the Code

Yakap Telehealth is a monorepo-based telehealth platform with a Next.js frontend, an Express backend, and a PostgreSQL database. The codebase is organized to separate UI, API, and shared domain concerns while keeping deployment and local development straightforward.

### Frontend
- `frontend/src/app` contains the app-router pages for patient and doctor workflows.
- `frontend/src/components/shared` contains layout and shell components used across roles, including navigation, dialogs, avatars, and confirmation UI.
- `frontend/src/components/ui` contains reusable visual primitives such as buttons, inputs, labels, dialogs, and textareas.
- `frontend/src/lib` handles API access, auth helpers, config, and utility functions.

The frontend focuses on role-based experiences:
- Patients can browse doctors, manage appointments, view notifications, and edit their profile.
- Doctors can manage availability, appointments, patients, notes, notifications, and profile data.

### Backend
- `backend/src/index.ts` wires the Express server together.
- `backend/src/routes` maps API endpoints for auth, appointments, doctors, patients, profile, notifications, and Gemini-based recommendations.
- `backend/src/controllers` translates HTTP requests into service calls.
- `backend/src/services` contains the business logic for appointment lifecycle, notifications, profiles, and AI-assisted recommendations.
- `backend/src/db` contains the connection pool and seeding logic.

The backend owns most business rules, including:
- appointment status transitions
- availability checks
- consultation note creation and updates
- notification creation and read-state updates
- automatic cleanup behaviors such as stale appointment cancellation and completion sweeps

### Database
- PostgreSQL stores users, patient and doctor profiles, appointments, consultation notes, notifications, and schedule data.
- The seed script creates realistic records so the UI can be tested with meaningful data.
- Schema and seed logic are designed to support role-specific views and lifecycle-based data.

### Deployment
- Dockerfiles and `docker-compose` support containerized local development and deployment.
- Railway is used for production deployment and database hosting.
- The build output is optimized for standalone deployment.

## Technical Limitations and Challenges

### 1. Notification state can drift between UI surfaces
The notifications page and the top-right header both need the same unread state. If one surface updates before the backend write completes, the badge count can become stale.

How to address it:
- Centralize unread-count fetching in a shared hook or client store.
- Trigger refresh only after successful notification updates.
- Consider a single source of truth via context, Zustand, or React Query.

### 2. Hover popovers are sensitive to pointer movement
Header hover menus can close too aggressively when the cursor crosses the gap between the icon and the dropdown.

How to address it:
- Use delayed close timers or a dedicated popover component.
- Prefer click-to-open on touch and mobile breakpoints.
- Use accessible primitives from a UI library when the interactions become more complex.

### 3. Profile editing is still form-heavy and manually synchronized
Profile screens currently manage local form state, confirmation dialogs, and save behavior by hand. This works, but it becomes repetitive and easy to drift between patient and doctor variants.

How to address it:
- Extract a shared profile form shell and field sections.
- Use a form library such as React Hook Form with schema validation.
- Reuse common save/confirm flow components across role pages.

### 4. Appointment scheduling logic is split between frontend and backend
The frontend handles reschedule selection and user interaction, while the backend validates availability and status transitions. This split is necessary, but it can make behavior harder to reason about.

How to address it:
- Keep the backend as the final authority for all validations.
- Move shared date/time helpers into a common utility package.
- Add integration tests for scheduling, rescheduling, and appointment status changes.

### 5. Consultation note access is intentionally restricted
Consultation notes are only editable when an appointment is completed. This is a valid business rule, but it can look like a broken flow if the user expects draft notes.

How to address it:
- Clarify the status-based UX in the interface.
- If draft notes are needed later, add a separate draft state and explicit publish action.
- Keep backend and frontend rules aligned so the restriction is consistent.

### 6. AI recommendation flow depends on upstream model behavior
The Gemini-based specialization recommendation flow relies on model output being valid JSON and aligned with a whitelist.

How to address it:
- Cache the AI client instead of constructing it per request.
- Add timeouts, retry limits, and stronger parsing.
- Keep a strict whitelist filter on model output.
- Add telemetry for latency and failure rates.

### 7. Error handling is still mostly request-by-request
Many flows use local `try/catch` blocks and manual error alerts. That is simple, but it can lead to inconsistent UX and duplicated logic.

How to address it:
- Standardize error-to-toast or error-banner handling.
- Add shared request wrappers and status handling.
- Use integration tests for the highest-value user journeys.

### 8. The codebase is functional but still manually coordinated across role variants
Patient and doctor screens often mirror each other closely, which makes consistency important but also increases maintenance cost.

How to address it:
- Extract shared role-agnostic components where possible.
- Keep visual tokens and shell patterns centralized.
- Add story-driven UI review for shared components before copying behavior across roles.

## Suggested Future Improvements
- Add a shared client state layer for notifications and unread counts.
- Convert repeated edit/save flows into reusable form patterns.
- Add stronger frontend and backend integration tests around appointments and notifications.
- Harden AI response handling and error mapping.
- Introduce shared date/time helpers for Manila-based scheduling logic.
- Expand documentation for role-specific flows as the product grows.

## Summary
The codebase is organized cleanly and is already strong in core telehealth workflows, but the next step is to reduce duplicated UI behavior, centralize state that appears in multiple places, and strengthen the more fragile flows such as notifications, scheduling, and AI-backed suggestions.
