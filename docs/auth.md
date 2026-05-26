# Auth

This API uses JWT bearer tokens for auth with email/password login.

## Endpoints

### `POST /api/v1/auth/login`

Authenticates a user with email and password, then returns a signed token.

#### Request body

```json
{
  "email": "maya.santos@example.com",
  "password": "password123"
}
```

Both `email` and `password` are required.

The `role` field is restricted to `patient` or `doctor`, and the same exact lowercase values are used throughout the API, UI, and database checks.

#### Response

```json
{
  "data": {
    "token": "eyJ...",
    "user": {
      "id": "7c1f...",
      "email": "maya.santos@example.com",
      "name": "Maya Santos",
      "role": "patient"
    }
  }
}
```

#### Notes

- Passwords are verified against the stored `password_hash` in the database.
- The token is signed with `JWT_SECRET`.
- Token lifetime is `7d`.

### `GET /api/v1/auth/me`

Returns the authenticated user.

#### Headers

```http
Authorization: Bearer <token>
```

#### Response

```json
{
  "data": {
    "id": "7c1f...",
    "email": "maya.santos@example.com",
    "name": "Maya Santos",
    "role": "patient"
  }
}
```

If the token is missing, invalid, or expired, the API returns `401`.

## How It Works

- `apps/api/src/routes/auth.ts` mounts the auth routes.
- `apps/api/src/controllers/auth.ts` handles the request and response shape.
- `apps/api/src/middleware/auth.ts` verifies bearer tokens and attaches `req.user`.

The middleware reads the token from the `Authorization` header, verifies it with `jsonwebtoken`, and populates `req.user` with the decoded user data.

## What is a JWT (JSON Web Token)?

- A JWT is a compact, URL-safe token that represents a set of claims (data) about a user. It's composed of three base64url-encoded parts separated by dots: `header.payload.signature`.
- The server signs the token (using `JWT_SECRET`) so the recipient can verify it wasn't tampered with.
- In this project the token payload includes the user's `id`, `email`, `name`, and `role`. The token is also issued with a `sub` (subject) claim set to the user's id and an expiry (`exp`) of `7d`.
- The server issues tokens with `issueAuthToken(user)` and verifies them with the `auth` middleware in `apps/api/src/middleware/auth.ts`.

### Example: using the token from a client

1. Login to receive a token:

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maya.santos@example.com","password":"password123"}'
```

2. Send the token on protected requests:

```http
Authorization: Bearer <token>
```

Or with curl:

```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

## Environment

Set `JWT_SECRET` in `.env` before using auth outside local development.

Seeded demo users all use `password123`.

Example:

```bash
JWT_SECRET=super-secret-value
```

## Example Usage

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maya.santos@example.com","password":"password123"}'
```

Then call protected endpoints with the returned token:

```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```
