-- ============================================================================
-- Voxly — Nested Comments schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- Depends on profiles_schema.sql and posts_schema.sql having been run first.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. comments table (self-referencing parent_id for unlimited nesting)
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  parent_id     uuid references public.comments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  content       text not null,
  edited        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint comment_content_length check (char_length(trim(content)) between 1 and 1000)
);

create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists comments_parent_id_idx on public.comments (parent_id);
create index if not exists comments_created_at_idx on public.comments (created_at asc);

-- Reuses the set_updated_at() function created by profiles_schema.sql.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create or replace function public.comments_mark_edited()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content then
    new.edited = true;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_mark_edited_trigger on public.comments;
create trigger comments_mark_edited_trigger
  before update on public.comments
  for each row execute function public.comments_mark_edited();

-- ----------------------------------------------------------------------------
-- 2. comment_likes table
-- ----------------------------------------------------------------------------
create table if not exists public.comment_likes (
  comment_id    uuid not null references public.comments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),

  primary key (comment_id, user_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes (comment_id);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;

drop policy if exists "Comments are publicly readable" on public.comments;
create policy "Comments are publicly readable"
  on public.comments for select
  using (true);

drop policy if exists "Users can create their own comments" on public.comments;
create policy "Users can create their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

drop policy if exists "Comment likes are publicly readable" on public.comment_likes;
create policy "Comment likes are publicly readable"
  on public.comment_likes for select
  using (true);

drop policy if exists "Users can like comments as themselves" on public.comment_likes;
create policy "Users can like comments as themselves"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike comments as themselves" on public.comment_likes;
create policy "Users can unlike comments as themselves"
  on public.comment_likes for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Realtime — broadcast changes so open comment threads update live
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comment_likes'
  ) then
    alter publication supabase_realtime add table public.comment_likes;
  end if;
end $$;
