-- ============================================================================
-- Voxly — Home Feed schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- Depends on profiles_schema.sql having been run first (uses public.profiles
-- and the public.set_updated_at() trigger function).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. posts table
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  content       text not null default '',
  image_url     text,
  hashtags      text[] not null default '{}',
  edited        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint content_length check (char_length(content) <= 2000),
  constraint content_or_image check (char_length(trim(content)) > 0 or image_url is not null)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists posts_hashtags_idx on public.posts using gin (hashtags);

-- Reuses the set_updated_at() function created by profiles_schema.sql.
-- Re-declared here so this file also works if run on its own.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Mark a post as "edited" whenever its content or image changes (but not on
-- every trivial update).
create or replace function public.posts_mark_edited()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content or new.image_url is distinct from old.image_url then
    new.edited = true;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_mark_edited_trigger on public.posts;
create trigger posts_mark_edited_trigger
  before update on public.posts
  for each row execute function public.posts_mark_edited();

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Posts are publicly readable"
  on public.posts for select
  using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Trending — hashtags and posts, scored by recent usage
-- ----------------------------------------------------------------------------
create or replace function public.get_trending_hashtags(p_limit int default 8, p_since interval default interval '3 days')
returns table (hashtag text, uses bigint)
language sql
stable
as $$
  select tag as hashtag, count(*) as uses
  from public.posts, unnest(hashtags) as tag
  where created_at > now() - p_since
  group by tag
  order by uses desc, tag asc
  limit p_limit;
$$;

create or replace function public.get_trending_posts(p_limit int default 10, p_offset int default 0, p_since interval default interval '3 days')
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
  score bigint
)
language sql
stable
as $$
  with trending as (
    select tag, count(*) as uses
    from public.posts, unnest(hashtags) as tag
    where created_at > now() - p_since
    group by tag
  )
  select
    p.id, p.user_id, p.content, p.image_url, p.hashtags, p.edited, p.created_at, p.updated_at,
    pr.username, pr.display_name, pr.avatar_url,
    coalesce(s.score, 0) as score
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  left join lateral (
    select sum(t.uses) as score
    from unnest(p.hashtags) as tag
    join trending t on t.tag = tag
  ) s on true
  where p.created_at > now() - p_since
  order by score desc, p.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.get_trending_hashtags(int, interval) to anon, authenticated;
grant execute on function public.get_trending_posts(int, int, interval) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Storage bucket — post-media (images attached to posts)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Files are stored under `<user_id>/<filename>`, so folder[1] == the owner's uid.
drop policy if exists "Post media is publicly readable" on storage.objects;
create policy "Post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "Users can upload their own post media" on storage.objects;
create policy "Users can upload their own post media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own post media" on storage.objects;
create policy "Users can update their own post media"
  on storage.objects for update
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Users can delete their own post media"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
