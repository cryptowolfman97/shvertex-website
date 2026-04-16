# SH Vertex Account + Supabase setup

This bundle turns the website account pages into a real Supabase-ready portal.

## 1. Create your Supabase project
- Create a new project in Supabase.
- In Authentication, enable Email + Password.

## 2. Configure URL settings
Set the Site URL to your deployed website root, for example:
- `https://shvertex.online`

Add Redirect URLs for the pages used by this portal, for example:
- `https://shvertex.online/dashboard.html`
- `https://shvertex.online/update-password.html`
- `https://www.shvertex.online/dashboard.html`
- `https://www.shvertex.online/update-password.html`
- local dev URLs if needed, such as `http://localhost:5500/dashboard.html` and `http://localhost:5500/update-password.html`

Do not test auth email redirects from `file://` pages opened directly from storage. Use a real hosted URL or a local web server.

## 3. Run the SQL schema
Open the SQL Editor in Supabase and run:
- `shvertex_supabase_schema.sql`

This creates:
- `profiles`
- `devices`
- `backups`
- private storage bucket `app-backups`
- RLS policies for each user to see only their own data

## 4. Add your Supabase client details to the website
Edit:
- `shv-supabase-config.js`

Replace the placeholders with your real values:
- `url`
- `publishableKey`

## 5. Upload the updated files
Upload the full bundle contents to your website hosting.

## 6. Test the flow
Recommended test order:
1. Create account
2. Confirm email if confirmation is enabled
3. Sign in
4. Open dashboard
5. Trigger forgot password
6. Complete password reset on `update-password.html`

## 7. First app integration target
Use **SimpliBudget** first.

Recommended backup storage path per file:
- `{user_id}/simplibudget/{device_id}/{timestamp}.backup.enc`

Recommended flow for the app later:
1. user signs in
2. app creates encrypted JSON/ZIP backup
3. app uploads file to `app-backups`
4. app inserts row into `public.backups`
5. app can later list and restore only that user's backups
