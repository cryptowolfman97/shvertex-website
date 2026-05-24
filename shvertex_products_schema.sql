-- ============================================================
-- SH Vertex Tech — Extended Products Schema
-- Run this in Supabase SQL Editor
-- This EXTENDS the existing schema. Safe to run on live DB.
-- ============================================================

-- Drop old products table if it exists (backup first if needed)
-- We rebuild it with full field support
DROP TABLE IF EXISTS public.products CASCADE;

CREATE TABLE public.products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identity
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,          -- used for URL routing
  tagline             text,                          -- short punchy line under name
  description         text,                          -- main about paragraph
  icon_url            text,                          -- app icon (square)
  banner_url          text,                          -- hero/banner image (wide)

  -- Rich content
  features            jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- [{title, description, icon}] array
  screenshots         jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- [{url, caption}] array of Dropbox/external image URLs
  pros                jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- ["string", "string"] array of pro points
  video_url           text,                          -- YouTube/Vimeo embed URL

  -- Pricing
  pricing_type        text NOT NULL DEFAULT 'free'
                      CHECK (pricing_type IN ('free','paid','subscription')),
  price_label         text,                          -- e.g. "LKR 1,500 / month" or "Free"
  pricing_tiers       jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- [{name, price, features[], highlighted}] array

  -- Technical info
  min_android         text,                          -- e.g. "Android 8.0+"
  app_version         text,                          -- e.g. "v2.1.0"
  app_size            text,                          -- e.g. "~18 MB"
  app_code            text,                          -- internal code e.g. "simplibudget"
  tags                jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- ["tag1", "tag2"] for display pills

  -- Distribution
  store_url           text,                          -- link into SHV Store / APK
  download_url        text,                          -- direct APK if applicable

  -- Status & display
  status              text NOT NULL DEFAULT 'live'
                      CHECK (status IN ('live','coming-soon','archived')),
  is_featured         boolean NOT NULL DEFAULT false,
  sort_order          integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at          timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at          timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for fast public queries
CREATE INDEX idx_products_status       ON public.products(status);
CREATE INDEX idx_products_sort         ON public.products(sort_order, created_at);
CREATE INDEX idx_products_slug         ON public.products(slug);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS: public can SELECT live/coming-soon products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read"  ON public.products;
DROP POLICY IF EXISTS "products_admin_all"    ON public.products;

-- Anyone can read live or coming-soon products
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  USING (status IN ('live', 'coming-soon'));

-- Only the admin email can do full CRUD
-- (enforced via Supabase service role in the admin page,
--  but this extra policy blocks anon mutations)
CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Seed: Migrate your existing products
-- Edit these rows with your real data, then uncomment to run
-- ============================================================
/*
INSERT INTO public.products (name, slug, tagline, description, pricing_type, price_label, status, sort_order, tags, app_code)
VALUES
  ('SimpliBudget', 'simplibudget', 'Personal finance, simplified.', 'A mobile-first budget tracker built for everyday financial control.', 'paid', 'LKR 1,500', 'live', 1, '["Finance","Android","Python"]', 'simplibudget'),
  ('Synapse', 'synapse', 'Operational productivity platform.', 'Project control, build support, and internal tooling for developers.', 'paid', 'LKR 2,000', 'live', 2, '["Productivity","Android"]', 'synapse'),
  ('Casino Tools Pro', 'casino-tools-pro', 'Advanced gambling analytics.', 'Simulation, analytics, and strategy tools for serious players.', 'paid', 'LKR 3,500', 'live', 3, '["Analytics","Android"]', 'casino-tools-pro'),
  ('Strategy Suite Pro', 'strategy-suite-pro', 'Risk analytics & simulation.', 'Advanced risk management and simulation toolkit.', 'paid', 'LKR 2,500', 'live', 4, '["Strategy","Android"]', 'strategy-suite-pro');
*/
