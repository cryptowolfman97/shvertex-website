# SH Vertex Website v2 — Deployment Guide

## Files in this package

| File | Description |
|------|-------------|
| `index.html` | Main homepage — full redesign |
| `products.html` | Dynamic product catalogue (Supabase-driven) |
| `store.html` | SHV Store download page |
| `account.html` | Account portal — all Supabase logic preserved |
| `future-products.html` | Roadmap page (loads coming-soon from DB) |
| `admin.html` | **NEW** Product admin dashboard |
| `shvertex_products_schema.sql` | **NEW** Extended Supabase schema — run this first |
| `shv-supabase-config.js` | Supabase config — UNCHANGED |
| `shv-account-common.js` | Account helper JS — UNCHANGED |

## DELETE from your repo (replaced by admin dashboard)
- `casino-tools-pro.html`
- `synapse.html`
- `simplibudget.html`
- `strategy-suite-pro.html`
- `shv-hub-7x9.html`

---

## Step 1 — Run the new Supabase schema

1. Go to your Supabase project → **SQL Editor**
2. Paste the full contents of `shvertex_products_schema.sql`
3. Click **Run**
4. Then uncomment and edit the seed INSERT block to migrate your existing products

## Step 2 — Deploy to GitHub

```bash
# Push all new files to your repo
git add .
git commit -m "v2 redesign — new admin dashboard, dynamic products catalogue"
git push
```

## Step 3 — Access the Admin Dashboard

- URL: `https://shvertex.online/admin.html`
- Sign in with your **existing Supabase admin email + password**
- The dashboard auto-detects your session — no separate admin account needed

## Step 4 — Add your products via the dashboard

1. Go to `admin.html` → **Add Product**
2. Fill in name, description, pricing, tags, features, pros
3. For images: upload to Dropbox → Share → Copy link → change `?dl=0` to `?raw=1` → paste in Icon URL or Screenshot URL
4. Hit **Save Product**
5. It appears instantly on `products.html`

## Admin Dashboard URL (keep private)
```
https://shvertex.online/admin.html
```
> Tip: You can rename this file to something less guessable (e.g. `shv-control-9x7.html`) for security by obscurity.

---

## Notes for Phase 2 (Kotlin app integration)
- The admin uses standard Supabase REST API (`products` table)
- Your Kotlin store app can read/write the same table using the same Supabase project
- All fields are designed to be read by both web and mobile
- `app_code` field links a product to its app logic in the store app

---

## Step 1b — Run the site_settings SQL (NEW)

The schema file now includes a `site_settings` table at the bottom.
Run the **same** `shvertex_products_schema.sql` file — it creates both tables in one go.

## Updating the Store APK link (going forward)

1. Go to `admin.html`
2. Click **Site Settings** in the left sidebar
3. Paste your new Dropbox APK URL (ending in `?dl=1`)
4. Click **Save Link**
5. Done — all 4 download buttons across the site update instantly

## New file added
| File | Description |
|------|-------------|
| `shv-settings.js` | Loads store APK URL from Supabase and applies to all buttons |
