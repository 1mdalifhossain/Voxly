-- ============================================================================
-- Voxly — Voice Rooms schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- Depends on profiles_schema.sql having been run first.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. rooms table
-- ----------------------------------------------------------------------------
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 100),
  description   text check (char_length(description) <= 280),
  status        text not null default 'live' check (status in ('live', 'ended')),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists rooms_status_idx on public.rooms (status, started_at desc);
create index if not exists rooms_host_id_idx on public.rooms (host_id);

-- ----------------------------------------------------------------------------
-- 2. room_participants table
--    One row per user per room. `left_at is null` means "currently in room".
--    A user can rejoin (a new row) after leaving.
-- ----------------------------------------------------------------------------
create table if not exists public.room_participants (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          text not null default 'listener' check (role in ('host', 'speaker', 'listener')),
  hand_raised   boolean not null default false,
  muted         boolean not null default true,
  joined_at     timestamptz not null default now(),
  left_at       timestamptz
);

-- Only one *active* (left_at is null) row per user per room.
create unique index if not exists room_participants_active_unique_idx
  on public.room_participants (room_id, user_id)
  where (left_at is null);

create index if not exists room_participants_room_id_idx on public.room_participants (room_id) where (left_at is null);
create index if not exists room_participants_user_id_idx on public.room_participants (user_id);

-- ----------------------------------------------------------------------------
-- 3. room_messages table (room chat, ephemeral — cleared when room ends by app logic if desired)
-- ----------------------------------------------------------------------------
create table if not exists public.room_messages (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  content       text not null check (char_length(content) between 1 and 500),
  created_at    timestamptz not null default now()
);

create index if not exists room_messages_room_id_idx on public.room_messages (room_id, created_at asc);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_messages enable row level security;

-- rooms: publicly readable, host can create/update/end their own
drop policy if exists "Rooms are publicly readable" on public.rooms;
create policy "Rooms are publicly readable"
  on public.rooms for select
  using (true);

drop policy if exists "Users can create rooms as themselves" on public.rooms;
create policy "Users can create rooms as themselves"
  on public.rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "Hosts can update their own rooms" on public.rooms;
create policy "Hosts can update their own rooms"
  on public.rooms for update
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- room_participants: publicly readable (so listener counts / participant
-- lists work), users manage their own row; hosts can update any row in
-- their own room (to promote/demote/mute/remove speakers).
drop policy if exists "Room participants are publicly readable" on public.room_participants;
create policy "Room participants are publicly readable"
  on public.room_participants for select
  using (true);

drop policy if exists "Users can insert their own participant row" on public.room_participants;
create policy "Users can insert their own participant row"
  on public.room_participants for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own participant row" on public.room_participants;
create policy "Users can update their own participant row"
  on public.room_participants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Hosts can manage participants in their own room" on public.room_participants;
create policy "Hosts can manage participants in their own room"
  on public.room_participants for update
  using (exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid()));

-- room_messages: readable + insertable by anyone who currently holds an
-- active participant row in that room.
drop policy if exists "Room messages are publicly readable" on public.room_messages;
create policy "Room messages are publicly readable"
  on public.room_messages for select
  using (true);

drop policy if exists "Active participants can send room messages" on public.room_messages;
create policy "Active participants can send room messages"
  on public.room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_participants p
      where p.room_id = room_messages.room_id
        and p.user_id = auth.uid()
        and p.left_at is null
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Realtime — rooms list, participant grid, and chat all update live
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_participants'
  ) then
    alter publication supabase_realtime add table public.room_participants;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_messages'
  ) then
    alter publication supabase_realtime add table public.room_messages;
  end if;
end $$;
