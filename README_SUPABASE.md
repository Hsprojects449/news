# Supabase setup and migration

This project ships with a small Supabase SQL migration and instructions to set up a Supabase project. The code in `lib/dbClient.ts` will automatically use Supabase when `SUPABASE_URL` and a `SUPABASE_*_KEY` are present in the environment; otherwise it falls back to the local mock data in `lib/db.ts`.

Steps to set up Supabase and run the migration

1. Create a Supabase project
   - Visit https://app.supabase.com and create a new project.

2. Get the project URL and keys
   - In the Supabase dashboard go to Settings → API and copy the `URL` and `Service Role Key` (for server-side use).

3. Create a `.env.local` in the project root and add values (example shown):

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=replace-with-a-long-random-string

# Optionally expose public vars for client usage
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. Run the migration
   - Option A (recommended for non-command-line users):
     - Open Supabase Dashboard → SQL Editor → New query.
     - Copy the SQL from `supabase/init.sql` and run it. This will create the tables and seed a default admin user (`admin` / `admin123`).

   - Option B (using psql / CLI):
     - Get a connection string from the Supabase dashboard or use `pg`/`psql` to run `supabase/init.sql` against your database.

5. Restart your dev server
   - The app checks env vars at runtime, so restart the dev server to pick up the values:

```powershell
npm run dev
```

6. Test admin login

Example (PowerShell):

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}'
```

Security notes
- Use the `SUPABASE_SERVICE_ROLE_KEY` only on the server — never expose it to client code or commit it to source control.
- Replace `JWT_SECRET` with a secure, unpredictable value in production.
- After migrating, consider rotating the seeded admin password and removing seeded users if not needed.

Next steps
- After confirming Supabase is working, I can update other API routes to use `dbClient` (read/write) instead of mock data and add migrations for initial content.
