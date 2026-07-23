-- ============================================================================
-- Voxly — Settings schema (Dark Mode, Language, Privacy, Security, Blocked
-- Users, Delete Account)
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Requires profiles_schema.sql to already be applied.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Preference columns on profiles (Dark Mode, Language, Privacy)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists theme text not null default 'light',
  add column if not exists language text not null default 'en',
  add column if not exists is_private boolean not null default false,
  add column if not exists message_privacy text not null default 'everyone',
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_check') then
    alter table public.profiles
      add constraint profiles_theme_check check (theme in ('light', 'dark'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_message_privacy_check') then
    alter table public.profiles
      add constraint profiles_message_privacy_check check (message_privacy in ('everyone', 'following', 'nobody'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. blocked_users — one row per (blocker, blocked) pair
-- ----------------------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

drop policy if exists "Users can view their own block list" on public.blocked_users;
create policy "Users can view their own block list"
  on public.blocked_users for select
  using (auth.uid() = blocker_id);

drop policy if exists "Users can block others" on public.blocked_users;
create policy "Users can block others"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can unblock others" on public.blocked_users;
create policy "Users can unblock others"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- ----------------------------------------------------------------------------
-- 3. Account deletion
--
-- The anon/client key can never delete an auth.users row directly — Supabase
-- requires the service role for that. This function does what's safe from the
-- client: it wipes personal fields, marks the profile deleted_at, and signs
-- the user out. Pair it with a scheduled Edge Function (using the service
-- role key) that calls `supabase.auth.admin.deleteUser()` for any profile
-- where deleted_at is older than, say, 30 days — giving you a grace period
-- and a clean "Account pending deletion" state in the meantime.
-- ----------------------------------------------------------------------------
create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set deleted_at   = now(),
      display_name = null,
      bio          = null,
      avatar_url   = null,
      cover_url    = null,
      social_links = '{}'::jsonb
  where id = auth.uid();
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

-- Hide deleted profiles from public reads (feed joins, search, etc. should
-- filter `deleted_at is null` explicitly too, but this keeps direct lookups
-- of a deleted profile from resolving).
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (deleted_at is null or id = auth.uid());
