# New machine setup (post-clone)

Follow this checklist whenever the repo is cloned onto a new system.

## 1) Prereqs
- Node.js: use Node 20 LTS (or >= 18.18.0)
- Package manager: pnpm (recommended) or npm
- Git (for version control)

Optional but handy:
- VS Code with TypeScript/ESLint extensions

## 2) Install dependencies
```powershell
# If you have pnpm
pnpm install

# Or with npm
npm install
```

## 3) Environment variables
- Copy `.env.example` to `.env.local` and fill the values.
- Required variables:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY (server only; do not expose to client)
  - SUPABASE_ANON_KEY (optional server fallback)
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (for browser uploads)
  - JWT_SECRET

> Tip: `.env.local` is ignored by git; keep your secrets out of the repo.

## 4) Supabase database & storage
1. Create a Supabase project (https://app.supabase.com) if you don’t already have one.
2. Run the migration in the Supabase SQL Editor. Open `supabase/init.sql`, copy its contents into the SQL editor, and run it.
   - This creates all tables, seeds a default admin (admin / admin123), creates storage buckets, and adds permissive storage policies for development.
3. If uploads fail with “Bucket not found”, either:
   - Re-run the bottom section of `supabase/init.sql` (the INSERT INTO storage.buckets statements), or
   - Call the admin-only health endpoint to auto-create missing buckets:
     - First obtain an admin token via POST /api/admin/login
     - Then call POST /api/_health/storage with `Authorization: Bearer <token>`.

## 5) Quick sanity checks
- Test server-side Supabase connectivity:
```powershell
node .\test-db-connection.js
```
- Check DB health route (requires the app running and admin token):
  - GET http://localhost:3000/api/_health/db
  - POST http://localhost:3000/api/_health/storage (admin only)

## 6) Run the dev server
```powershell
npm run dev
# or
pnpm dev
```

If port 3000 is busy, set `PORT` in `.env.local`.

## Common issues and fixes
- “Supabase not configured”: `.env.local` is missing/incorrect. Ensure SUPABASE_URL and a key are present on the server (service role preferred). Restart dev server after editing env.
- “Bucket not found” on upload: Ensure `submissions`, `articles`, `jobs`, `pages`, `advertisements`, and `live-updates` buckets exist in Supabase. Use the SQL in `supabase/init.sql` or POST /api/_health/storage.
- Admin login fails: The init SQL seeds an admin user `admin` with password `admin123`. Change it in production.
- Windows PowerShell notes: Use backslashes for local file paths, and ensure execution policy allows Node to run scripts.

## Security notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Keep it only in server envs.
- Rotate the seeded admin credentials and JWT_SECRET for production.

## More details
See `README_SUPABASE.md` for Supabase-specific setup and migration notes.
