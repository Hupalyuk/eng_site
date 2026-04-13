# Backend Auth (Node + Express + MySQL)

## Setup
1. Create `.env` from `.env.example` and fill DB credentials.
2. Create the database + tables:
   ```sql
   source schema.sql;
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

## Endpoints
- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Notes
- Sessions are stored in MySQL via `express-mysql-session`.
- Cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- CORS allows `FRONTEND_ORIGIN` with credentials.
