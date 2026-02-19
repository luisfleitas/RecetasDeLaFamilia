# Authentication and Authorization (MVP)

## Session model
- Auth uses JWT access tokens.
- Server sets session token as an `HttpOnly` cookie: `recetas_access_token`.
- Cookie settings:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Path=/`
  - `Secure=true` in production
- API middleware accepts cookie token first, with `Authorization: Bearer ...` fallback for compatibility.

## Protected pages
These pages redirect unauthenticated users to `/login`:
- `/recipes/new`
- `/recipes/[id]/edit`
- `/account/change-password`

## Recipe ownership rules
Server-side ownership enforcement:
- Only authenticated users can create, update, delete recipes.
- Only owner can update/delete:
  - `recipe.created_by_user_id == authenticated_user.user_id`

UI visibility rules on recipe detail page:
- Owner sees `Edit` and `Delete` controls.
- Non-owner or unauthenticated users do not see `Edit`/`Delete` controls.

## Auth API behavior
- `POST /api/auth/register`
  - Creates user and auto-signs in by setting session cookie.
  - Returns `201`.
  - Duplicate email/username returns `409`.
- `POST /api/auth/login`
  - Validates username/password.
  - Sets session cookie.
  - Returns `200` with token payload (for compatibility tooling/tests).
- `POST /api/auth/logout`
  - Clears session cookie.
  - Returns `200`.
- `POST /api/auth/change-password`
  - Requires auth.
  - Requires `current_password`, `new_password` (`>= 8`).

## Expected authorization responses
- `401 Unauthorized`
  - Unauthenticated mutation attempts (`POST/PUT/DELETE /api/recipes*`, `change-password`).
- `403 Forbidden`
  - Authenticated user tries to mutate another user's recipe.

## Regression checks
- `./scripts/auth-smoke-test.sh`
  - Core auth, ownership, and recipe detail owner-control visibility.
- `./scripts/route-guards-smoke-test.sh`
  - Protected page redirects and auth-aware nav visibility.
- `./scripts/logout-smoke-test.sh`
  - Login/logout lifecycle and post-logout access revocation.
