-- SH Vertex Account / Cloud backup starter schema for Supabase
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'Standard',
  account_status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_code text not null,
  device_name text not null,
  device_fingerprint_hash text,
  platform text,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  app_code text not null,
  backup_name text not null,
  storage_path text not null unique,
  version text,
  backup_size bigint not null default 0,
  checksum text,
  is_auto boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_devices_user_id on public.devices(user_id);
create index if not exists idx_backups_user_id_created_at on public.backups(user_id, created_at desc);
create index if not exists idx_backups_device_id on public.backups(device_id);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.backups enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, plan, account_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'SH Vertex Customer'),
    'Standard',
    'active'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_devices_updated_at on public.devices;
create trigger trg_devices_updated_at
  before update on public.devices
  for each row execute procedure public.set_updated_at();

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "devices_select_own" on public.devices;
drop policy if exists "devices_insert_own" on public.devices;
drop policy if exists "devices_update_own" on public.devices;
drop policy if exists "devices_delete_own" on public.devices;
drop policy if exists "backups_select_own" on public.backups;
drop policy if exists "backups_insert_own" on public.backups;
drop policy if exists "backups_update_own" on public.backups;
drop policy if exists "backups_delete_own" on public.backups;
drop policy if exists "backup_objects_select_own" on storage.objects;
drop policy if exists "backup_objects_insert_own" on storage.objects;
drop policy if exists "backup_objects_update_own" on storage.objects;
drop policy if exists "backup_objects_delete_own" on storage.objects;

-- Table policies
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid())
;

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid())
;

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid())
;

create policy "devices_select_own"
  on public.devices for select
  to authenticated
  using (user_id = auth.uid())
;

create policy "devices_insert_own"
  on public.devices for insert
  to authenticated
  with check (user_id = auth.uid())
;

create policy "devices_update_own"
  on public.devices for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
;

create policy "devices_delete_own"
  on public.devices for delete
  to authenticated
  using (user_id = auth.uid())
;

create policy "backups_select_own"
  on public.backups for select
  to authenticated
  using (user_id = auth.uid())
;

create policy "backups_insert_own"
  on public.backups for insert
  to authenticated
  with check (user_id = auth.uid())
;

create policy "backups_update_own"
  on public.backups for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid())
;

create policy "backups_delete_own"
  on public.backups for delete
  to authenticated
  using (user_id = auth.uid())
;

-- Storage bucket for encrypted backup files
insert into storage.buckets (id, name, public)
values ('app-backups', 'app-backups', false)
on conflict (id) do nothing;

create policy "backup_objects_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'app-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
;

create policy "backup_objects_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'app-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
;

create policy "backup_objects_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'app-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'app-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
;

create policy "backup_objects_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'app-backups'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
;
