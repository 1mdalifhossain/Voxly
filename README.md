# Voxly

A premium landing page for Voxly, a real-time social platform — built with React, Vite, Tailwind CSS, and scaffolded for Supabase (Auth, Postgres, Storage, Realtime).

## Structure

```
src/
  components/
    Logo.jsx               Speech-bubble "V" mark
    NavBar.jsx              Sticky nav with Login / Get Started
    Hero.jsx                Hero section + floating conversation cards
    ConversationBubble.jsx  Reusable mock chat-bubble card
    Features.jsx            Feature grid
    FeatureCard.jsx          Single feature card
    ScreenshotSection.jsx    Browser-frame product mockup
    Footer.jsx               Footer with link columns
  lib/
    supabaseClient.js       Supabase client + usage notes for Auth/Realtime/Storage
  App.jsx
  main.jsx
  index.css
```

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL and anon key
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Wiring up Supabase

The client is already set up in `src/lib/supabaseClient.js`. From here you can:

- **Auth** — `supabase.auth.signUp()` / `signInWithPassword()` for the Login and Get Started buttons.
- **Postgres** — model `profiles`, `posts`, `comments`, `communities` tables in the Supabase SQL editor.
- **Storage** — create a `post-media` bucket for photo/video uploads.
- **Realtime** — subscribe to `postgres_changes` on `posts` for a live feed, or use Presence for the "482 people talking now" style indicators.

## Profile System

Full username/avatar/cover/bio/follow profile system backed by Supabase Postgres + Storage.

```
src/
  lib/
    profiles.js                   Data layer: profiles, follows, and image uploads
  context/
    ProfileContext.jsx             Exposes the signed-in user's own profile via useProfile()
  components/profile/
    Avatar.jsx                     Circular avatar with initials fallback
    CoverPhoto.jsx                 Banner image with gradient fallback
    ImageUploadField.jsx           Hover-to-upload wrapper (used for both avatar & cover)
    SocialLinks.jsx                Icon row for website/Twitter/Instagram/GitHub/YouTube
    FollowButton.jsx                Optimistic follow/unfollow toggle
    FollowListModal.jsx             Followers / Following list modal
  pages/
    Profile.jsx                    Public profile page — /u/:username
    EditProfile.jsx                 Edit form — /settings/profile
supabase/
  profiles_schema.sql              SQL: profiles + follows tables, RLS, triggers, storage buckets
```

### Setup

1. **Run the SQL.** Open your Supabase project → SQL Editor → paste the contents of
   `supabase/profiles_schema.sql` → Run. This creates:
   - a `profiles` table (username, display name, bio, avatar/cover URLs, social links, join date)
   - a trigger that auto-creates a profile row (with a unique username) whenever someone signs up
   - a `follows` table for the followers/following graph
   - Row Level Security policies (profiles and follows are publicly readable; only the owner can write)
   - two public Storage buckets, `avatars` (5MB limit) and `covers` (8MB limit), with policies so
     each user can only upload/update/delete files under their own `<user_id>/...` folder
2. **That's it** — no separate Storage setup needed, the SQL script creates the buckets too.

### Routes

- `/u/:username` — public profile: cover photo, avatar, display name, bio, join date, social
  links, follower/following counts (tap to open the list modal), and a Follow/Following button
  (or an Edit profile button on your own page).
- `/settings/profile` — edit display name, username (live availability check), bio, avatar, cover
  photo, and social links.

Both are wrapped in `ProtectedRoute`, so they require an active session, matching the rest of the
authenticated app.

## Home Feed

Create/edit/delete posts (text, image, emoji, hashtags) with an infinite-scroll Recent feed and
a hashtag-driven Trending feed, backed by Supabase Postgres + Storage.

```
src/
  lib/
    posts.js                       Data layer: posts CRUD, pagination, hashtag parsing, trending
    format.js                       formatRelativeTime() for "2h" / "3d" style timestamps
  components/feed/
    PostComposer.jsx                 Text + image + emoji composer, live hashtag preview
    EmojiPicker.jsx                  Emoji grid popover
    PostCard.jsx                     Single post: hashtag highlighting, owner edit/delete
    TrendingSidebar.jsx              Top trending hashtags widget
  pages/
    Dashboard.jsx                    Home Feed — /dashboard
supabase/
  posts_schema.sql                  SQL: posts table, RLS, trending functions, storage bucket
```

### Setup

1. Run `supabase/profiles_schema.sql` first if you haven't (the feed joins on `profiles`).
2. Open your Supabase project → SQL Editor → paste the contents of `supabase/posts_schema.sql` →
   Run. This creates:
   - a `posts` table (content, optional image, parsed `hashtags[]`, edited flag)
   - Row Level Security (posts are publicly readable; only the owner can insert/update/delete)
   - `get_trending_hashtags()` and `get_trending_posts()` SQL functions that rank by hashtag
     usage over the last few days
   - a public `post-media` Storage bucket (8MB limit) with per-user upload/update/delete policies

### Features

- **Create Post** — text (up to 2,000 characters), an optional image, an emoji picker, and
  `#hashtags` that are parsed live and previewed as chips before posting.
- **Recent feed** — newest-first, cursor-paginated, loads more automatically as you scroll
  (infinite scroll via `IntersectionObserver`).
- **Trending feed** — posts ranked by how often their hashtags appear across the last 3 days;
  the sidebar (or, on mobile, an inline widget) surfaces the top trending hashtags — tap one to
  filter either feed down to just that tag.
- **Edit / Delete own posts** — available from the `···` menu on any post you authored; editing
  re-parses hashtags and marks the post "edited", deleting asks for confirmation first.
- **Responsive** — single-column feed on mobile with the trending widget inline; a sticky
  two-column layout (feed + trending sidebar) on `lg` screens and up.

## Nested Comments

Threaded replies (unlimited depth), edit/delete on your own comments, likes, and live updates
across open browser tabs via Supabase Realtime.

```
src/
  lib/
    comments.js                    Data layer: CRUD, tree building, likes, realtime subscriptions
  components/feed/
    CommentComposer.jsx             Reusable input for a new top-level comment or a reply
    CommentItem.jsx                  Recursive comment: reply/edit/delete/like + nested children
    CommentsSection.jsx              Orchestrates a post's thread: loads, subscribes, renders
supabase/
  comments_schema.sql               SQL: comments (self-referencing) + comment_likes, RLS, realtime
```

### Setup

1. Run `profiles_schema.sql` and `posts_schema.sql` first if you haven't.
2. Open your Supabase project → SQL Editor → paste the contents of `supabase/comments_schema.sql`
   → Run. This creates:
   - a `comments` table with a self-referencing `parent_id` for unlimited nesting
   - a `comment_likes` table (one row per user per comment)
   - Row Level Security (comments and likes are publicly readable; only the owner can
     insert/update/delete their own)
   - adds both tables to the `supabase_realtime` publication so open threads update live
3. **Enable Realtime** in your Supabase project if it isn't already: Database → Replication →
   confirm `comments` and `comment_likes` are listed (the SQL script adds them automatically,
   this is just a place to double-check).

### Features

- **Reply** — reply to any comment, at any depth; replies render nested under their parent
  (visually capped at 5 indent levels so very deep threads stay readable on mobile).
- **Edit / Delete** — available on comments you authored; deleting a comment removes its replies
  too (enforced by the database via `on delete cascade`).
- **Like Comment** — optimistic heart toggle with a live count.
- **Real Time** — new comments, edits, deletes, and likes from other people/tabs appear
  automatically in any currently-open thread via `postgres_changes` subscriptions — no refresh
  needed.

Comment threads are collapsed by default under each post — tap "Comments" on a post to load and
expand its thread.

## Voice Rooms

Clubhouse-style live audio rooms, powered by [Agora.io](https://www.agora.io) for the real-time
audio and Supabase for room/participant/chat state and presence.

```
src/
  lib/
    rooms.js                        Data layer: rooms/participants/chat CRUD + realtime subscriptions
    agoraClient.js                   Thin Agora RTC client + optional token-fetch helper
  hooks/
    useAgoraRoom.js                  Joins/leaves the RTC channel, publishes mic, tracks who's speaking
  components/rooms/
    RoomCard.jsx                     Lobby grid card: title, host, live badge, timer, listener count
    CreateRoomModal.jsx              "Start a room" form
    ParticipantsList.jsx             Groups participants into Host & Speakers / Listening
    ParticipantTile.jsx              Avatar with speaking glow, mute/raised-hand badges, host menu
    RoomControls.jsx                 Bottom bar: Mute/Unmute, Raise/Lower Hand, Leave/End
    RoomChat.jsx                     Live in-room text chat
    RoomTimer.jsx                    Ticking "how long has this been live" display
    LiveIndicator.jsx                Pulsing LIVE badge
  pages/
    Rooms.jsx                        Lobby: browse live rooms, start a new one
    Room.jsx                         The live room itself
supabase/
  rooms_schema.sql                   SQL: rooms, room_participants, room_messages, RLS, realtime
```

### Roles

- **Host** — created the room. Automatically unmuted-capable, can promote/demote speakers,
  force-mute anyone, remove participants, and End the room for everyone.
- **Speaker** — can publish audio (subject to their own mute toggle). Promoted by the host from
  the listener pool, usually after raising a hand.
- **Listener** — receives audio only. Can Raise Hand to ask the host for the mic.

### Setup

1. Run `profiles_schema.sql` first if you haven't.
2. Open your Supabase project → SQL Editor → paste the contents of `supabase/rooms_schema.sql` →
   Run. This creates `rooms`, `room_participants`, and `room_messages`, sets up Row Level Security
   (rooms/participants/messages are publicly readable; a host manages their own room and its
   participants; everyone manages their own participant row), and adds all three tables to the
   `supabase_realtime` publication.
3. Create a free project at [agora.io](https://www.agora.io) and grab its **App ID** (Console →
   Project Management). Set `VITE_AGORA_APP_ID` in your `.env`.
4. For local development, set your Agora project's primary certificate to **disabled** ("App ID
   only" auth) in the Agora Console — Voice Rooms will join channels with a null token, which only
   works in that mode. **Before shipping to real users**, enable the certificate and stand up a
   small token server (an Agora RTC token signed server-side, e.g. as a Supabase Edge Function
   using `agora-token`), then point `VITE_AGORA_TOKEN_ENDPOINT` at it — `lib/agoraClient.js` will
   pick it up automatically and fetch a fresh token before every join.
5. `npm install` (pulls in `agora-rtc-sdk-ng`).

### Features

- **Host / Speaker / Listener** — three roles with different mic permissions, enforced both in the
  UI and (for state changes) via Postgres RLS.
- **Raise Hand** — listeners flag interest in speaking; the host sees a bouncing hand badge on
  their tile and can promote them with one tap.
- **Mute / Unmute** — hosts and speakers control their own mic; a host can also force-mute anyone
  on stage.
- **Room Chat** — a live text sidebar alongside the audio, for links, questions, or listeners who
  aren't on stage.
- **Room Timer** — ticking elapsed time since the room went live, shown in the header and on lobby
  cards.
- **Room Participants** — a live-updating grid, grouped into Host & Speakers and Listening, with
  a running count in the header.
- **Live Indicator** — a pulsing "LIVE" badge on both the lobby card and the room header.

Ending a room (host only) marks it `ended` in the database, which immediately redirects everyone
else in the room back to the lobby via realtime.

## Admin Panel

A moderation and analytics dashboard at `/admin`, gated to accounts with `profiles.is_admin = true`.

```
src/
  lib/
    admin.js                       Data layer: stats, user/post/report/room moderation queries
  components/admin/
    AdminLayout.jsx                  Sidebar + top bar shell shared by every /admin/* page
    AdminSidebar.jsx                  Desktop sidebar + mobile slide-over nav
    AdminProtectedRoute.jsx           Route guard: requires a session AND is_admin
    StatCard.jsx                      Dashboard stat tile
    AdminBadge.jsx                    Status pill (live/ended, pending/resolved, admin, banned)
    TrendChart.jsx                    Dependency-free SVG bar chart for signup/post trends
    BanUserModal.jsx                   Ban confirmation with a reason field
    ConfirmActionModal.jsx            Generic confirm dialog (delete post, end room, resolve/dismiss report)
  pages/
    BannedNotice.jsx                  Full-page notice shown to banned users at /banned
  pages/admin/
    AdminDashboard.jsx                Overview — /admin
    AdminUsers.jsx                    Search, filter, ban/unban — /admin/users
    AdminPosts.jsx                    Search, delete any post — /admin/posts
    AdminReports.jsx                  Moderation queue — /admin/reports
    AdminVoiceRooms.jsx               Live/ended rooms, force-end — /admin/rooms
    AdminAnalytics.jsx                Signup/post trends with adjustable range — /admin/analytics
supabase/
  admin_schema.sql                   SQL: is_admin/is_banned columns, reports table, admin RLS, get_admin_stats()
```

### Setup

1. Run `profiles_schema.sql`, `posts_schema.sql`, and `rooms_schema.sql` first if you haven't.
2. Open your Supabase project → SQL Editor → paste the contents of `supabase/admin_schema.sql` → Run. This:
   - adds `is_admin`, `is_banned`, `ban_reason`, and `banned_at` to `profiles`
   - creates a `reports` table (post/user/room/comment reports, with RLS so only the reporter and
     admins can read a given report)
   - adds admin-only RLS policies so admins can update any profile (to ban/unban), delete any post,
     and end any room — layered on top of the existing owner-only policies, not replacing them
   - blocks banned users from creating new posts or rooms at the database level
   - adds a `get_admin_stats()` function powering the dashboard's stat cards
3. Make your own account an admin — run once in the SQL editor with your user id (Authentication →
   Users, or `select id from auth.users where email = '...'`):
   ```sql
   update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000000';
   ```
4. Sign in with that account — a new **Administration** section appears in Settings linking to `/admin`.

### Features

- **Dashboard** — total/new/banned users, total posts, live rooms, and pending reports, plus
  14-day signup and post trend charts.
- **Users** — search by username/display name, filter to admins or banned accounts, ban with a
  reason (shown to the user) or unban.
- **Posts** — search post content and delete any post immediately, regardless of author.
- **Reports** — a pending/resolved/dismissed/all queue of user-submitted reports on posts, users,
  rooms, or comments; mark resolved once you've acted, or dismiss if no action is needed.
- **Voice Rooms** — see every live or ended room with host and listener count, and force-end a
  live room, which immediately redirects everyone in it back to the lobby.
- **Analytics** — signup and post creation trends over a 7/14/30-day window.
- **Banned users** — anyone with `is_banned = true` is redirected to a full-page notice at
  `/banned` (showing the reason, if one was given) instead of the rest of the app, and is blocked
  by RLS from posting or starting rooms even if they bypass the UI.

Admin status and bans are just columns on `profiles`, and the `is_admin()` SQL helper is reused
across every admin RLS policy — extending moderation to another table (e.g. letting admins delete
any comment) is a matter of adding one more `using (public.is_admin(auth.uid()))` policy following
the same pattern.

## Theme

Primary brand blue is `#2563EB`, defined as `brand-600` in `tailwind.config.js` (with a full `brand` shade scale). Display type is Space Grotesk, body type is Inter.

## Production Readiness Notes

A few things were tightened up for production. Worth knowing what changed and what's still on you:

**Performance**
- All routes in `main.jsx` are now `React.lazy()`-loaded behind a `Suspense` boundary instead of
  bundled eagerly. The public landing page no longer pays for the weight of the dashboard, admin
  panel, or (biggest offender) the Agora SDK — that only downloads once someone actually opens a
  voice room.
- `vite.config.js` splits `react`/`react-router-dom`, `@supabase/supabase-js`, and
  `agora-rtc-sdk-ng` into separate vendor chunks so browsers can cache them independently across
  deploys. Initial JS payload dropped from one ~2.2 MB bundle to ~250 KB.

**Reliability**
- `src/components/ErrorBoundary.jsx` now wraps the whole app in `main.jsx`. A render crash shows a
  recovery screen with a reload button instead of a blank white page. Swap the `console.error` in
  `componentDidCatch` for real error reporting (Sentry, etc.) before you actually ship.
- `src/lib/supabaseClient.js` logs a clear console error in dev if `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are missing, instead of failing later with a cryptic network error.

**Accessibility**
- Added `src/hooks/useEscapeKey.js` — a shared hook so overlays close on the Escape key. Wired into
  every modal/dropdown that didn't already have it: `LikersModal`, `FollowListModal`,
  `CreateRoomModal`, the mobile `AdminSidebar` drawer, `NotificationBell`, `ParticipantTile`'s
  action menu, and `PostCard`'s options menu.
- Their backdrop/click-catcher `<div>`s are now `aria-hidden="true"` (they're purely visual click
  targets — each modal already had a real, labeled close button screen readers can reach).

**SEO & metadata**
- `index.html` now has Open Graph and Twitter Card tags, a canonical link, and `theme-color`.
  **Replace `YOUR-DOMAIN-HERE`** (in `index.html`, `public/robots.txt`, and `public/sitemap.xml`)
  with your real production domain before deploying — these are placeholders.
- Added `public/favicon.svg`, PNG/ICO fallbacks, `apple-touch-icon.png`, `site.webmanifest`
  (installable-app metadata), a placeholder `og-image.png` (swap for a designed one), `robots.txt`,
  and a minimal `sitemap.xml`. Since this is a client-rendered SPA, only the public `/` route is
  listed — everything else needs a session and shouldn't be indexed anyway.
  - **Heads up:** true SEO for the authenticated app (profiles, posts) would need server-side
    rendering or prerendering, which is a bigger architectural decision — not something to bolt on
    here. The landing page is what search engines will actually see.

**Housekeeping**
- Added a `.gitignore` — there wasn't one, so `node_modules/`, `dist/`, and (critically) a real
  `.env` with live Supabase/Agora credentials had no protection from being committed.

