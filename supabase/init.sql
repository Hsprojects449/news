-- Supabase initialization SQL
-- Run this in the Supabase SQL editor (or via psql) to create the required tables
-- NOTE: This script uses gen_random_uuid() from the pgcrypto extension.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin','moderator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  category text,
  image_url text,
  video_url text,
  author text,
  source text,
  published_date timestamptz,
  views integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('published','pending','rejected')),
  submitted_by text,
  submitted_email text,
  submitted_phone text,
  is_paid boolean DEFAULT false,
  reward numeric,
  is_featured boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  is_latest boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text,
  location text,
  description text,
  image_url text,
  apply_url text,
  apply_email text,
  posted_date timestamptz,
  status text NOT NULL CHECK (status IN ('active','expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  title text,
  description text,
  image_url text,
  -- Optional: link to an article created from an approved submission
  article_id uuid,
  video_url text,
  -- Store uploaded file metadata (array of objects)
  files jsonb,
  submitted_date timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending','approved','rejected')),
  approved_date timestamptz,
  rejected_date timestamptz,
  rejection_reason text,
  amount numeric,
  paid_status text CHECK (paid_status IN ('pending','paid')),
  paid_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Advertisements
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  image_url text,
  link text,
  position text CHECK (position IN ('left','right','top','bottom')),
  is_active boolean DEFAULT true,
  created_date timestamptz DEFAULT now()
);

-- Featured stories
CREATE TABLE IF NOT EXISTS featured_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  added_date timestamptz DEFAULT now()
);

-- Static content pages (About, Terms, Privacy)
CREATE TABLE IF NOT EXISTS pages (
  id text PRIMARY KEY,
  title text NOT NULL,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default pages if not present
INSERT INTO pages (id, title, content)
VALUES
  ('about', 'About Us', 'Your trusted source for news and opportunities.'),
  ('terms', 'Terms & Conditions', 'Please read our terms and conditions carefully.'),
  ('privacy', 'Privacy Policy', 'We respect your privacy and protect your data.')
ON CONFLICT (id) DO NOTHING;

-- Home page settings (single-row table; client can select the latest row)
CREATE TABLE IF NOT EXISTS homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title text,
  hero_description text,
  show_breaking_news boolean DEFAULT true,
  show_categories boolean DEFAULT true,
  show_featured_stories boolean DEFAULT true,
  show_trending_section boolean DEFAULT true,
  show_latest_section boolean DEFAULT true,
  show_advertisements boolean DEFAULT true,
  categories_displayed text[],
  featured_stories_count integer DEFAULT 6,
  created_at timestamptz DEFAULT now()
);

-- Live updates (for short, timely updates shown on the homepage)
CREATE TABLE IF NOT EXISTS live_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security and policies for live_updates
ALTER TABLE live_updates ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to read only active updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_updates' AND policyname = 'Public read active live updates'
  ) THEN
    CREATE POLICY "Public read active live updates" ON live_updates
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Optional: allow authenticated users to read all (if needed by admin without service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_updates' AND policyname = 'Authenticated read all live updates'
  ) THEN
    CREATE POLICY "Authenticated read all live updates" ON live_updates
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Sample admin user (password is bcrypt hash for 'admin123')
INSERT INTO admins (username, password, role)
VALUES ('admin', '$2b$10$k4MudNMufS45Iw71KpnoceSK9hsA8iUgzhEYE9sHDkm5jZBBAVfvG', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- ===== STORAGE BUCKETS =====
-- Create storage buckets for file uploads
-- Note: Run these in Supabase SQL Editor if buckets don't exist
-- Buckets: articles, jobs, pages, submissions

-- Create submissions bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Create articles bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;

-- Create jobs bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('jobs', 'jobs', true)
ON CONFLICT (id) DO NOTHING;

-- Create pages bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('pages', 'pages', true)
ON CONFLICT (id) DO NOTHING;

-- Create advertisements bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('advertisements', 'advertisements', true)
ON CONFLICT (id) DO NOTHING;

-- Create live-updates bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-updates', 'live-updates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for submissions bucket
-- Allow public (anon) access for all operations
CREATE POLICY "Public read submissions files"
ON storage.objects FOR SELECT
USING (bucket_id = 'submissions');

CREATE POLICY "Public upload submissions files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submissions');

CREATE POLICY "Public update submissions files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'submissions');

CREATE POLICY "Public delete submissions files"
ON storage.objects FOR DELETE
USING (bucket_id = 'submissions');

-- Storage policies for articles bucket
-- Allow public (anon) access for all operations
CREATE POLICY "Public read articles files"
ON storage.objects FOR SELECT
USING (bucket_id = 'articles');

CREATE POLICY "Public upload articles files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'articles');

CREATE POLICY "Public update articles files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'articles');

CREATE POLICY "Public delete articles files"
ON storage.objects FOR DELETE
USING (bucket_id = 'articles');

-- Storage policies for jobs bucket
-- Allow public (anon) access for all operations
CREATE POLICY "Public read jobs files"
ON storage.objects FOR SELECT
USING (bucket_id = 'jobs');

CREATE POLICY "Public upload jobs files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'jobs');

CREATE POLICY "Public update jobs files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'jobs');

CREATE POLICY "Public delete jobs files"
ON storage.objects FOR DELETE
USING (bucket_id = 'jobs');

-- Storage policies for pages bucket
-- Allow public (anon) access for all operations
CREATE POLICY "Public read pages files"
ON storage.objects FOR SELECT
USING (bucket_id = 'pages');

CREATE POLICY "Public upload pages files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pages');

CREATE POLICY "Public update pages files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pages');

CREATE POLICY "Public delete pages files"
ON storage.objects FOR DELETE
USING (bucket_id = 'pages');

-- Storage policies for advertisements bucket
-- Allow public (anon) access for all operations
CREATE POLICY "Public read advertisements files"
ON storage.objects FOR SELECT
USING (bucket_id = 'advertisements');

CREATE POLICY "Public upload advertisements files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'advertisements');

CREATE POLICY "Public update advertisements files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'advertisements');

CREATE POLICY "Public delete advertisements files"
ON storage.objects FOR DELETE
USING (bucket_id = 'advertisements');

-- Storage policies for live-updates bucket
-- Allow public (anon) access for all operations
CREATE POLICY "Public read live-updates files"
ON storage.objects FOR SELECT
USING (bucket_id = 'live-updates');

CREATE POLICY "Public upload live-updates files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'live-updates');

CREATE POLICY "Public update live-updates files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'live-updates');

CREATE POLICY "Public delete live-updates files"
ON storage.objects FOR DELETE
USING (bucket_id = 'live-updates');

-- Live updates image support
ALTER TABLE public.live_updates
  ADD COLUMN IF NOT EXISTS image_url text;
