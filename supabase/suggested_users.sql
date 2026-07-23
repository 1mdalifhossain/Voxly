-- ============================================================================
-- Voxly — Suggested Users
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses OR REPLACE.
-- Depends on profiles_schema.sql (profiles, follows) having been run first.
-- ============================================================================

-- Suggests profiles the given user doesn't already follow (and isn't
-- themselves), ranked by follower count so the most-followed accounts surface
-- first. Works for logged-out visitors too (pass p_user_id as null).
create or replace function public.get_suggested_users(p_user_id uuid default null, p_limit int default 5)
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
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    (select count(*) from public.follows f2 where f2.following_id = p.id) as followers_count
  from public.profiles p
  where (p_user_id is null or p.id <> p_user_id)
    and not exists (
      select 1 from public.follows f
      where f.follower_id = p_user_id and f.following_id = p.id
    )
  order by followers_count desc, p.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_suggested_users(uuid, int) to anon, authenticated;
