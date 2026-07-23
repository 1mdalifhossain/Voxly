-- ============================================================================
-- Voxly — Admin Panel schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- Depends on profiles_schema.sql, posts_schema.sql, and rooms_schema.sql
-- having been run first.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Admin + moderation columns on profiles
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;

create index if not exists profiles_is_banned_idx on public.profiles (is_banned) where (is_banned);

-- Helper used throughout the admin RLS policies below. `security definer` so
-- it can read profiles.is_admin regardless of the calling user's own RLS.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- To make your own account an admin, run this once with your user id
-- (find it in Authentication → Users, or `select id from auth.users where email = '...'`):
--   update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000000';

-- ----------------------------------------------------------------------------
-- 2. reports table — user-submitted reports on a post, user, room, or comment
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  target_type   text not null check (target_type in ('post', 'user', 'room', 'comment')),
  target_id     uuid not null,
  target_label  text, -- snapshot of the target (username / post excerpt / room title) so the
                       -- report still reads sensibly if the target is later edited or removed
  reason        text not null check (char_length(reason) between 1 and 60),
  details       text check (char_length(coalesce(details, '')) <= 500),
  status        text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  resolved_by   uuid references public.profiles (id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists "Admins can read all reports" on public.reports;
create policy "Admins can read all reports"
  on public.reports for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Reporters can read their own reports" on public.reports;
create policy "Reporters can read their own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. Admin bypass policies — let admins act on rows they don't own
--    (these are *additional* policies; Postgres OR's them with the existing
--    owner-only ones from profiles_schema.sql / posts_schema.sql / rooms_schema.sql)
-- ----------------------------------------------------------------------------
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete any post" on public.posts;
create policy "Admins can delete any post"
  on public.posts for delete
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can end any room" on public.rooms;
create policy "Admins can end any room"
  on public.rooms for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Banned users can't create new content
--    (re-declares the insert policies from posts_schema.sql / rooms_schema.sql
--    with an added is_banned check; safe to re-run)
-- ----------------------------------------------------------------------------
drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );

drop policy if exists "Users can create rooms as themselves" on public.rooms;
create policy "Users can create rooms as themselves"
  on public.rooms for insert
  with check (
    auth.uid() = host_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );

-- ----------------------------------------------------------------------------
-- 5. Dashboard stats — one round trip instead of five separate count queries
-- ----------------------------------------------------------------------------
create or replace function public.get_admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;

  return (
    select json_build_object(
      'total_users', (select count(*) from public.profiles),
      'banned_users', (select count(*) from public.profiles where is_banned),
      'new_users_today', (select count(*) from public.profiles where created_at >= current_date),
      'total_posts', (select count(*) from public.posts),
      'live_rooms', (select count(*) from public.rooms where status = 'live'),
      'pending_reports', (select count(*) from public.reports where status = 'pending')
    )
  );
end;
$$;

revoke all on function public.get_admin_stats() from public;
grant execute on function public.get_admin_stats() to authenticated;
