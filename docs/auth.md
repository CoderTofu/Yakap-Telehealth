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
