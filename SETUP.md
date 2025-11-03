# Setup Instructions - When Cloning to a New Machine

## Prerequisites
- Node.js 18+ installed
- Git installed
- Access to Supabase project

## 1. Clone and Install

```bash
git clone <your-repo-url>
cd projects
npm install
# or if using pnpm:
pnpm install
```

## 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
copy .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side Supabase (for admin operations)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret for admin authentication
JWT_SECRET=your-secure-random-string-min-32-chars
```

### Getting Supabase Keys:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL → `SUPABASE_URL`
4. Copy the `anon` `public` key → `SUPABASE_ANON_KEY`
5. Copy the `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Generating JWT_SECRET:
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## 3. Database Setup

### Run SQL Initialization Script
1. Open Supabase SQL Editor
2. Copy entire contents of `supabase/init.sql`
3. Run the script
4. Verify tables created: `admins`, `articles`, `jobs`, `submissions`, `advertisements`, `pages`, `homepage_settings`, `live_updates`

### Verify Storage Buckets
The SQL script creates these buckets:
- `articles`
- `jobs`
- `submissions`
- `advertisements`
- `pages`
- `live-updates`

Check in Supabase Dashboard > Storage. If any are missing:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('bucket-name', 'bucket-name', true)
ON CONFLICT (id) DO NOTHING;
```

### Storage Policies
The script includes public read/write policies for all buckets. Verify in Storage > Policies.

## 4. Default Admin Account

Default credentials (created by init.sql):
- Username: `admin`
- Password: `admin123`

**Important:** Change this immediately after first login!

## 5. Run Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

## 6. Test Basic Functionality

### Test Admin Access
1. Go to `/admin/login`
2. Login with default credentials
3. Navigate to News Management
4. Try creating a test article with multiple images

### Test File Upload
1. Go to `/submit`
2. Try uploading multiple files as a guest
3. Check admin submissions to verify

### Test Advertisements
1. Go to `/admin/advertisements`
2. Create an ad with:
   - Multiple media files
   - Display duration (e.g., 5 seconds)
3. Visit homepage to verify carousel

## 7. Build for Production

```bash
npm run build
npm start
```

Or deploy to Vercel/Netlify (they auto-detect Next.js):
```bash
# Connect your repo to Vercel/Netlify
# Set environment variables in their dashboard
# Deploy will happen automatically on git push
```

## Common Issues & Solutions

### Issue: "Bucket not found" error
**Solution:** Run bucket creation SQL or call `/api/_health/storage` (requires admin JWT)

### Issue: Upload fails with RLS error
**Solution:** Verify storage policies exist (see init.sql storage policies section)

### Issue: Build fails with TypeScript errors
**Solution:** 
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Issue: Images don't display
**Solution:** Check:
1. Supabase URL in `.env.local` matches your project
2. Buckets are set to `public = true`
3. Storage policies allow public read access

### Issue: Admin login fails
**Solution:** Check:
1. JWT_SECRET is set in `.env.local`
2. Default admin exists in database (run init.sql)
3. Check browser console for errors

## Project Structure

```
projects/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── news/              # Public news pages
│   └── ...
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn)
│   ├── file-upload.tsx   # Single file upload
│   ├── multi-file-upload.tsx  # Multiple files upload
│   ├── media-gallery.tsx     # Article media gallery
│   └── advertisements-carousel.tsx  # Ads carousel
├── lib/                   # Utilities
│   ├── dbClient.ts       # Supabase database client
│   ├── uploadHelpers.ts  # File upload utilities
│   ├── supabase.ts       # Server Supabase client
│   └── supabaseClient.ts # Browser Supabase client
├── supabase/
│   └── init.sql          # Database initialization script
├── .env.local            # Environment variables (create this)
└── .env.example          # Environment template

```

## Features Implemented

### Core Features
- ✅ News articles with categories
- ✅ Job board
- ✅ Guest story submissions
- ✅ Admin dashboard with JWT auth
- ✅ Live breaking news updates
- ✅ Static content pages (About, Terms, Privacy)
- ✅ Homepage settings management

### Media Features (NEW)
- ✅ Multiple images/videos per article
- ✅ Multiple media per advertisement
- ✅ Auto-rotating ad carousel with configurable timing
- ✅ Media gallery with fullscreen mode
- ✅ Multiple file uploads for submissions
- ✅ Thumbnail navigation
- ✅ Video playback support

### Upload & Storage
- ✅ Direct client uploads to Supabase Storage
- ✅ File size validation
- ✅ Type validation (image/video)
- ✅ Preview before upload
- ✅ Delete old files on replace

## Next Steps

1. **Security Hardening:**
   - Change default admin password
   - Restrict storage policies for production
   - Add rate limiting to submission endpoint
   - Enable RLS on all tables

2. **Customization:**
   - Update branding/logo
   - Customize color scheme in `app/globals.css`
   - Add analytics tracking
   - Configure email notifications

3. **Content:**
   - Add initial articles
   - Set up homepage settings
   - Create static page content
   - Add advertisements

4. **Optimization:**
   - Add image optimization (Next.js Image component)
   - Enable caching headers
   - Set up CDN for Supabase Storage
   - Add SEO metadata

## Documentation

- **Multiple Media Guide:** See `MULTIPLE_MEDIA_GUIDE.md`
- **API Documentation:** Check `app/api/` route files
- **Component Docs:** See inline JSDoc in component files

## Support & Resources

- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com/

## License

[Your License Here]
