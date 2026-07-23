-- ============================================================================
-- Voxly — Notification Center schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS /
-- DROP TRIGGER IF EXISTS.
-- Depends on profiles_schema.sql, posts_schema.sql, comments_schema.sql, and
-- post_likes_schema.sql having been run first.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notifications table
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users (id) on delete cascade,
  actor_id      uuid not null references auth.users (id) on delete cascade,
  type          text not null check (type in ('like', 'comment', 'follow', 'mention')),
  post_id       uuid references public.posts (id) on delete cascade,
  comment_id    uuid references public.comments (id) on delete cascade,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id) where not read;

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
--    Notifications are only ever written by the trigger functions below (they
--    run as the function owner and so aren't blocked by RLS) — there is
--    deliberately no insert policy for regular users, so nobody can forge a
--    notification "from" someone else.
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Users can dismiss their own notifications" on public.notifications;
create policy "Users can dismiss their own notifications"
  on public.notifications for delete
  using (auth.uid() = recipient_id);

-- ----------------------------------------------------------------------------
-- 3. Mention parsing helper — pulls unique @usernames out of free text
-- ----------------------------------------------------------------------------
create or replace function public.extract_mentions(p_content text)
returns setof text
language sql
immutable
as $$
  select distinct lower(m[1])
  from regexp_matches(coalesce(p_content, ''), '@([a-zA-Z0-9_]{3,20})', 'g') as m;
$$;

-- ----------------------------------------------------------------------------
-- 4. Likes → notify the post's owner (skip self-likes)
-- ----------------------------------------------------------------------------
create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select user_id into v_recipient from public.posts where id = new.post_id;
  if v_recipient is not null and v_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (v_recipient, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify
  after insert on public.post_likes
  for each row execute function public.notify_post_like();

-- Unliking retracts the notification, so a stale "liked your post" can't
-- linger for a like that no longer exists.
create or replace function public.notify_post_unlike()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'like' and post_id = old.post_id and actor_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists post_likes_notify_delete on public.post_likes;
create trigger post_likes_notify_delete
  after delete on public.post_likes
  for each row execute function public.notify_post_unlike();

-- ----------------------------------------------------------------------------
-- 5. Comments → notify the post's owner, and the parent comment's author on
--    replies (skip self and duplicate recipients)
-- ----------------------------------------------------------------------------
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner    uuid;
  v_parent_author uuid;
begin
  select user_id into v_post_owner from public.posts where id = new.post_id;
  if v_post_owner is not null and v_post_owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (v_post_owner, new.user_id, 'comment', new.post_id, new.id);
  end if;

  if new.parent_id is not null then
    select user_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is not null
       and v_parent_author <> new.user_id
       and v_parent_author is distinct from v_post_owner then
      insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (v_parent_author, new.user_id, 'comment', new.post_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

-- ----------------------------------------------------------------------------
-- 6. Follows → notify the followed user (skip self, retract on unfollow)
-- ----------------------------------------------------------------------------
create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.following_id <> new.follower_id then
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_follow();

create or replace function public.notify_unfollow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'follow' and recipient_id = old.following_id and actor_id = old.follower_id;
  return old;
end;
$$;

drop trigger if exists follows_notify_delete on public.follows;
create trigger follows_notify_delete
  after delete on public.follows
  for each row execute function public.notify_unfollow();

-- ----------------------------------------------------------------------------
-- 7. Mentions — @username in a new post or comment notifies each mentioned
--    user who actually has an account (skip mentioning yourself)
-- ----------------------------------------------------------------------------
create or replace function public.notify_post_mentions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
  v_user_id  uuid;
begin
  for v_username in select * from public.extract_mentions(new.content) loop
    select id into v_user_id from public.profiles where lower(username) = v_username;
    if v_user_id is not null and v_user_id <> new.user_id then
      insert into public.notifications (recipient_id, actor_id, type, post_id)
      values (v_user_id, new.user_id, 'mention', new.id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions
  after insert on public.posts
  for each row execute function public.notify_post_mentions();

create or replace function public.notify_comment_mentions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
  v_user_id  uuid;
begin
  for v_username in select * from public.extract_mentions(new.content) loop
    select id into v_user_id from public.profiles where lower(username) = v_username;
    if v_user_id is not null and v_user_id <> new.user_id then
      insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (v_user_id, new.user_id, 'mention', new.post_id, new.id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists comments_notify_mentions on public.comments;
create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function public.notify_comment_mentions();

-- ----------------------------------------------------------------------------
-- 8. Realtime — broadcast new/updated/removed notifications instantly
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
