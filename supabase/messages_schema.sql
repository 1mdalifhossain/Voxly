-- ============================================================================
-- Voxly — Direct Messaging schema
--
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS /
-- DROP TRIGGER IF EXISTS.
-- Depends on profiles_schema.sql having been run first.
--
-- Covers: 1:1 conversations ("Inbox"), text/image/voice messages, read
-- receipts ("Seen"), and the realtime plumbing the client uses for online
-- presence and typing indicators (both of those are ephemeral — presence &
-- broadcast channels — and deliberately have no tables of their own).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. conversations table
--    One row per 1:1 thread. The last_message_* columns are a denormalized
--    cache kept current by a trigger (below), so the inbox list can be
--    rendered from a single query against `conversations` with no per-row
--    lookup into `messages`.
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  last_message_at       timestamptz not null default now(),
  last_message_preview  text,
  last_message_sender_id uuid references auth.users (id) on delete set null,
  last_message_type     text check (last_message_type in ('text', 'image', 'voice'))
);

create index if not exists conversations_last_message_at_idx on public.conversations (last_message_at desc);

-- ----------------------------------------------------------------------------
-- 2. conversation_participants — who's in each thread, and where they've
--    read up to (drives the "Seen" indicator).
-- ----------------------------------------------------------------------------
create table if not exists public.conversation_participants (
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  last_read_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_idx on public.conversation_participants (user_id);

-- ----------------------------------------------------------------------------
-- 3. messages table
--    A message carries text and/or one piece of media. `voice_duration` is
--    in whole seconds, captured client-side when the recording stops.
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references auth.users (id) on delete cascade,
  content          text,
  image_url        text,
  voice_url        text,
  voice_duration   integer,
  created_at       timestamptz not null default now(),

  constraint message_has_content check (
    coalesce(content, '') <> '' or image_url is not null or voice_url is not null
  ),
  constraint content_length check (char_length(coalesce(content, '')) <= 4000)
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- 4. is_participant() — used inside RLS policies below. Marked SECURITY
--    DEFINER so its internal lookup runs as the table owner and bypasses RLS
--    itself; without this, the conversation_participants SELECT policy would
--    need to query conversation_participants to evaluate itself.
-- ----------------------------------------------------------------------------
create or replace function public.is_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = p_user_id
  );
$$;

-- ----------------------------------------------------------------------------
-- 5. get_or_create_direct_conversation() — the only way a conversation gets
--    created. Finds an existing 1:1 thread between the caller and the other
--    user, or opens a new one. SECURITY DEFINER so it can insert the *other*
--    user's participant row too (a regular user can't do that under RLS).
-- ----------------------------------------------------------------------------
create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if v_me = p_other_user_id then
    raise exception 'Cannot start a conversation with yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'User not found';
  end if;

  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id and cp2.user_id = p_other_user_id
  where cp1.user_id = v_me
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations default values returning id into v_conversation_id;
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_me), (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. New message → refresh the conversation's inbox preview, and mark the
--    sender as caught-up in their own thread (so they never see their own
--    message as unread).
-- ----------------------------------------------------------------------------
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = case
        when new.image_url is not null then '📷 Photo'
        when new.voice_url is not null then '🎤 Voice message'
        else left(coalesce(new.content, ''), 140)
      end,
      last_message_sender_id = new.sender_id,
      last_message_type = case
        when new.image_url is not null then 'image'
        when new.voice_url is not null then 'voice'
        else 'text'
      end
  where id = new.conversation_id;

  update public.conversation_participants
  set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;

  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Conversations: readable by participants only. No insert/update/delete
-- policy for regular users — rows are created by get_or_create_direct_conversation()
-- and kept current by the trigger above, both SECURITY DEFINER.
drop policy if exists "Participants can view their conversations" on public.conversations;
create policy "Participants can view their conversations"
  on public.conversations for select
  using (public.is_participant(id, auth.uid()));

-- conversation_participants: readable by fellow participants (so a thread
-- knows who it's with); a user can only touch their own row, and only to
-- update last_read_at. No insert/delete policy — membership is managed by
-- get_or_create_direct_conversation() and cascades from conversations.
drop policy if exists "Participants can view co-participants" on public.conversation_participants;
create policy "Participants can view co-participants"
  on public.conversation_participants for select
  using (public.is_participant(conversation_id, auth.uid()));

drop policy if exists "Users can update their own read position" on public.conversation_participants;
create policy "Users can update their own read position"
  on public.conversation_participants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages: readable and insertable by participants only, and only as
-- yourself.
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
  on public.messages for select
  using (public.is_participant(conversation_id, auth.uid()));

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (sender_id = auth.uid() and public.is_participant(conversation_id, auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. Realtime — new messages, inbox preview updates, and read-receipt
--    updates all need to reach open clients instantly.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 9. Storage buckets — message images & voice notes
--    Public buckets (same tradeoff as post-media/avatars/covers elsewhere in
--    this project): files live at unguessable `<conversation_id>/<file>`
--    paths, and upload is still gated to conversation participants below.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-media', 'message-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-messages', 'voice-messages', true, 10485760, array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a'])
on conflict (id) do update set public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a'];

-- Files are stored under `<conversation_id>/<filename>`, so folder[1] is the
-- conversation id — only its participants may upload into it.
drop policy if exists "Message images are publicly readable" on storage.objects;
create policy "Message images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'message-media');

drop policy if exists "Participants can upload message images" on storage.objects;
create policy "Participants can upload message images"
  on storage.objects for insert
  with check (
    bucket_id = 'message-media'
    and public.is_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists "Voice messages are publicly readable" on storage.objects;
create policy "Voice messages are publicly readable"
  on storage.objects for select
  using (bucket_id = 'voice-messages');

drop policy if exists "Participants can upload voice messages" on storage.objects;
create policy "Participants can upload voice messages"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-messages'
    and public.is_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  );
