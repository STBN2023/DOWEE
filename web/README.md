# DoWee Web (Next.js 14)

Minimal app to bootstrap the first admin user via a secure API.

## Quick start
1. Node 18+
2. Copy env template
   ```bash
   cd web
   copy .env.example .env.local   # Windows
   # or: cp .env.example .env.local
   ```
3. Fill `.env.local`
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only)
   - `SETUP_TOKEN` — shared secret to protect the bootstrap route
   - `BOOTSTRAP_ENABLED` — set to `true` only during bootstrap (leave empty/omit otherwise)
4. Install deps and run
   ```bash
   npm install
   npm run dev
   ```
5. Temporarily enable bootstrap
   - Set `BOOTSTRAP_ENABLED=true` in `.env.local`
   - Restart the dev server if needed
6. Call the API to create the first admin
   ```bash
   curl -X POST http://localhost:3000/api/admin/bootstrap \
     -H "x-setup-token: YOUR_SETUP_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "ChangeMe123!",
       "displayName": "Admin"
     }'
   ```
7. Disable bootstrap immediately
   - Remove or set `BOOTSTRAP_ENABLED` to empty/false in `.env.local`
   - Consider rotating `SETUP_TOKEN` and the Supabase Service Role key

## Notes
- Endpoint refuses if an admin already exists.
- Route is disabled by default and returns `410` unless `BOOTSTRAP_ENABLED=true`.
- Service Role Key is used server-side only in the API route.
- After success, keep the route disabled (or remove `app/api/admin/bootstrap/route.ts`).

## Authentication (UI)

1. Configure env
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - Keep `SUPABASE_SERVICE_ROLE_KEY` only for server code (API route)

2. Login UI
   - Start dev server and open http://localhost:3000/auth/login
   - Enter email/password of an existing Supabase Auth user (e.g., the admin you bootstrapped)
   - On success, you will be redirected to http://localhost:3000/admin

3. Admin page
   - Minimal page at `app/admin/page.tsx` shows the logged user email and a Sign out button
   - Session is checked client-side for now; for stronger protection, add middleware or server-side checks
