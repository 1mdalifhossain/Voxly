-- ============================================================================
-- Voxly — Search schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE.
-- Depends on profiles_schema.sql and posts_schema.sql having been run first.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Full-text search index for post content
-- ----------------------------------------------------------------------------
alter table public.posts
  add column if not exists content_tsv tsvector
  generated always as (to_tsvector('english', coalesce(content, ''))) stored;

create index if not exists posts_content_tsv_idx on public.posts using gin (content_tsv);

-- Trigram index so user search tolerates partial/typo'd queries efficiently.
create extension if not exists pg_trgm;
create index if not exists profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx on public.profiles using gin (display_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 2. Users — matches username or display name, exact match first, then by
--    follower count so the most-established accounts surface first.
-- ----------------------------------------------------------------------------
create or replace function public.search_users(p_query text, p_limit int default 10, p_offset int default 0)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  followers_count bigint
)
language sql
stable
as $$
  select
    p.id, p.username, p.display_name, p.avatar_url, p.bio,
    (select count(*) from public.follows f where f.following_id = p.id) as followers_count
  from public.profiles p
  where p.username ilike '%' || p_query || '%'
     or coalesce(p.display_name, '') ilike '%' || p_query || '%'
  order by
    (lower(p.username) = lower(p_query)) desc,
    followers_count desc,
    p.username asc
  limit p_limit offset p_offset;
$$;

-- ----------------------------------------------------------------------------
-- 3. Posts — full-text search over content, ranked by relevance then recency.
-- ----------------------------------------------------------------------------
create or replace function public.search_posts(p_query text, p_limit int default 10, p_offset int default 0)
returns table (
  id uuid,
  user_id uuid,
  content text,
  image_url text,
  hashtags text[],
  edited boolean,
  created_at timestamptz,
  updated_at timestamptz,
  username text,
  display_name text,
  avatar_url text,
  rank real
)
language sql
stable
as $$
  select
    p.id, p.user_id, p.content, p.image_url, p.hashtags, p.edited, p.created_at, p.updated_at,
    pr.username, pr.display_name, pr.avatar_url,
    ts_rank(p.content_tsv, websearch_to_tsquery('english', p_query)) as rank
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.content_tsv @@ websearch_to_tsquery('english', p_query)
  order by rank desc, p.created_at desc
  limit p_limit offset p_offset;
$$;

-- ----------------------------------------------------------------------------
-- 4. Hashtags — substring match over all-time usage, most-used first.
-- ----------------------------------------------------------------------------
create or replace function public.search_hashtags(p_query text, p_limit int default 10, p_offset int default 0)
returns table (hashtag text, uses bigint)
language sql
stable
as $$
  select tag as hashtag, count(*) as uses
  from public.posts, unnest(hashtags) as tag
  where tag ilike '%' || lower(p_query) || '%'
  group by tag
  order by uses desc, tag asc
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_users(text, int, int) to anon, authenticated;
grant execute on function public.search_posts(text, int, int) to anon, authenticated;
grant execute on function public.search_hashtags(text, int, int) to anon, authenticated;
