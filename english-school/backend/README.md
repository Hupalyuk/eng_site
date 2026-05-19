# Backend Auth (Node + Express + PostgreSQL / Supabase)

## Setup
1. Create/edit `.env`.
2. For Supabase, set:
   - `DATABASE_URL` (Session pooler string from Supabase, port `6543`)
   - `PGSSLMODE=require`
3. For local Postgres (without Supabase), set:
   - `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`
4. For Google Calendar OAuth, set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (example: `https://your-backend.onrender.com/api/google/callback`)
   - `FRONTEND_ORIGIN` (where user returns after connect, can be comma-separated)
5. Create the tables:
   ```sql
   -- run schema.sql inside your Postgres DB
   \i schema.sql
   ```
6. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

## Endpoints
- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/google/status`
- `GET /api/google/connect`
- `GET /api/google/callback`
- `GET /api/class/calendar`

## Notes
- Sessions are stored in PostgreSQL via `connect-pg-simple`.
- Cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- CORS allows `FRONTEND_ORIGIN` with credentials.
- If `DATABASE_URL` is provided, backend connects through it first.
- `FRONTEND_ORIGIN` supports multiple domains separated by comma.
- For cross-domain frontend/backend in production use:
  - `SESSION_SAME_SITE=none`
  - `SESSION_SECURE=true`
