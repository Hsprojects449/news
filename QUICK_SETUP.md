# Quick Setup Instructions

## 1. 🔐 Reset Admin Login

### Run this SQL in Supabase SQL Editor:
```sql
-- Remove all existing admin users
DELETE FROM admins;

-- Create new admin user
INSERT INTO admins (username, password, role) 
VALUES ('admin', '$2b$10$6BwZJc83gTufFXwb0C61aOE9.3BOY/7/21MdsuceDEGiQlnvPXPGu', 'super_admin');

-- Verify creation
SELECT id, username, role, created_at FROM admins;
```

### New Login Credentials:
- **Username**: `admin`
- **Password**: `Newsadmin@2025`

## 2. 🚀 Deploy to Vercel

### Add Environment Variables:
Go to: https://vercel.com/hsprojects449-9120s-projects/news/settings/environment-variables

Add these variables for **Production, Preview & Development**:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://jkmmetrbfxvorhjszrpi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbW1ldHJiZnh2b3JoanN6cnBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg2MTk4MiwiZXhwIjoyMDc3NDM3OTgyfQ.w9b8usLQBiX7dRRisk4TVWV-3ogAz9N7JSo5bSG5FeM` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbW1ldHJiZnh2b3JoanN6cnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjE5ODIsImV4cCI6MjA3NzQzNzk4Mn0.0bft-zxVkgeP151FYFik0tVonhnHkDLoJqoY8bpeCEk` |
| `JWT_SECRET` | `ea443fd8b18ecf7046a6214c1451f52fb552bc0925acf7b35913865f40b099bad937cfb66b854cbe549b7dd613c7da95f8ad3b1daf081cc77bf0037ac49134ef` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jkmmetrbfxvorhjszrpi.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbW1ldHJiZnh2b3JoanN6cnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjE5ODIsImV4cCI6MjA3NzQzNzk4Mn0.0bft-zxVkgeP151FYFik0tVonhnHkDLoJqoY8bpeCEk` |

### Redeploy:
```bash
vercel --prod
```

## 3. 🌐 Your Live App

- **URL**: https://news-nok1x9ljv-hsprojects449-9120s-projects.vercel.app
- **Admin Login**: https://news-nok1x9ljv-hsprojects449-9120s-projects.vercel.app/admin/login

## 4. ✅ That's It!

Your news website is now live with:
- ✅ New admin credentials 
- ✅ Supabase database
- ✅ Deployed on Vercel
- ✅ Free hosting

**Total cost: $0/month** (Vercel Free + Supabase Free tier)