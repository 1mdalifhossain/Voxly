-- ============================================================================
-- Voxly — Post Likes schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- Depends on profiles_schema.sql and posts_schema.sql having been run first.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. post_likes table
-- ----------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id       uuid not null references public.posts (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),

  primary key (post_id, user_id)
);

create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);
create index if not exists post_likes_created_at_idx on public.post_likes (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.post_likes enable row level security;

drop policy if exists "Post likes are publicly readable" on public.post_likes;
create policy "Post likes are publicly readable"
  on public.post_likes for select
  using (true);

drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike posts as themselves" on public.post_likes;
create policy "Users can unlike posts as themselves"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Realtime — broadcast changes so open feeds / "who liked" lists update live
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;
end $$;
