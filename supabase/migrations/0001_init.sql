-- Carfooly database: tables, security rules (Row Level Security) and automatic notifications.
-- Anyone signed in can read; you can only create, change or delete your own things.
-- Rules the app relies on are enforced HERE, so a modified app can't break them.

create extension if not exists citext;

-- ============ people ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext not null unique check (handle::text ~ '^[a-z0-9_.]{2,24}$'),   -- always lowercase, unique
  name text not null default '' check (char_length(name) <= 40),
  bio text not null default '' check (char_length(bio) <= 150),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),        -- you can follow someone only once
  check (follower_id <> followee_id)             -- and never yourself
);

-- Private to each person.
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ============ cars ============
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  make text not null check (char_length(make) between 1 and 30),
  model text not null check (char_length(model) between 1 and 40),
  year text not null check (year ~ '^[0-9]{4}$'),
  nickname text not null default '' check (char_length(nickname) <= 40),
  engine text not null default '', power text not null default '', gearbox text not null default '',
  weight text not null default '', wheels text not null default '',
  zero_to_sixty text not null default '', top_speed text not null default '',
  photo_url text,
  has_page boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.car_mods (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create table public.car_follows (
  car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (car_id, user_id)
);

create table public.car_spots (
  car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (car_id, user_id)
);

create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  spotter_id uuid not null references public.profiles(id) on delete cascade,
  make text not null check (char_length(make) between 1 and 30),
  model text not null check (char_length(model) between 1 and 40),
  year text not null, trim text not null default '',
  photo_url text,
  matched_car_id uuid references public.cars(id) on delete set null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ communities ============
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  description text not null default '' check (char_length(description) <= 200),
  kind text not null default 'custom' check (kind in ('brand', 'custom')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index communities_name_unique on public.communities (lower(btrim(name)));  -- one per name

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 1000),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.thread_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create table public.thread_likes (
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (thread_id, user_id)
);

-- ============ posts ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid references public.cars(id) on delete set null,
  car_label text not null default '' check (char_length(car_label) <= 50),
  community_id uuid references public.communities(id) on delete set null,
  photos jsonb not null default '[]'::jsonb,          -- [{ url, aspect }], up to 10
  caption text not null default '' check (char_length(caption) <= 280),
  location jsonb,                                      -- { label, city, lat, lng }
  tags uuid[] not null default '{}',                   -- tagged people
  archived boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 10),
  check (cardinality(tags) <= 10)
);
create index posts_created on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)                       -- one like per person
);

create table public.hidden_posts (                     -- "Not interested", private
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,   -- set = a reply
  text text not null check (char_length(text) between 1 and 220),
  created_at timestamptz not null default now()
);
create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);

-- A car's story: created, mods, spots, posts.
create table public.car_events (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  type text not null check (type in ('created', 'mod', 'spot', 'post', 'followBuild')),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  detail text not null default '', mod_name text not null default '', mod_note text not null default '',
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============ meets ============
create table public.meets (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  location text not null check (char_length(location) between 1 and 160),
  lat double precision, lng double precision,
  city text not null default '', country text not null default '',
  starts_at text not null check (starts_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),   -- local time as picked
  note text not null default '' check (char_length(note) <= 500),
  cover_url text,
  sponsors text[] not null default '{}' check (cardinality(sponsors) <= 8),
  driver_cap int check (driver_cap is null or driver_cap between 1 and 9999),
  attendee_cap int check (attendee_cap is null or attendee_cap between 1 and 9999),
  created_at timestamptz not null default now()
);

create table public.meet_attendees (
  meet_id uuid not null references public.meets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer', 'driver', 'attendee')),
  primary key (meet_id, user_id)                       -- one role per person per meet
);

create table public.news_likes (
  news_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (news_id, user_id)
);

-- ============ reports (only the app owner reads these, in the dashboard) ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('post', 'comment', 'reply', 'user', 'meet', 'community', 'thread', 'threadReply', 'car')),
  target_id text not null,
  reason text not null check (char_length(reason) <= 80),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ============ notifications (written only by the database) ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'reply', 'follow', 'spot', 'followBuild', 'commentLike', 'tag', 'threadReply')),
  post_id uuid references public.posts(id) on delete cascade,
  car_id uuid references public.cars(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  thread_id uuid references public.threads(id) on delete cascade,
  text text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_recipient on public.notifications (recipient_id, created_at desc);
-- Repeats (follow/unfollow/follow…) never pile up: one row per person per thing.
create unique index notifications_once on public.notifications (
  recipient_id, actor_id, type,
  coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(car_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid)
) where type in ('follow', 'like', 'followBuild', 'spot', 'commentLike', 'tag');

-- ============ helper functions ============
create or replace function public.notify(p_to uuid, p_from uuid, p_type text, p_post uuid, p_car uuid, p_comment uuid, p_thread uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_to is null or p_to = p_from then return; end if;                      -- never notify yourself
  if exists (select 1 from blocks where blocker_id = p_to and blocked_id = p_from) then return; end if;
  if p_type in ('follow', 'like', 'followBuild', 'spot', 'commentLike', 'tag') then
    insert into notifications (recipient_id, actor_id, type, post_id, car_id, comment_id, thread_id, text)
    values (p_to, p_from, p_type, p_post, p_car, p_comment, p_thread, p_text)
    on conflict (recipient_id, actor_id, type,
      coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(car_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid))
      where type in ('follow', 'like', 'followBuild', 'spot', 'commentLike', 'tag')
    do update set created_at = now(), read = false;
  else
    insert into notifications (recipient_id, actor_id, type, post_id, car_id, comment_id, thread_id, text)
    values (p_to, p_from, p_type, p_post, p_car, p_comment, p_thread, p_text);
  end if;
end $$;

create or replace function public.unnotify(p_to uuid, p_from uuid, p_type text, p_post uuid, p_car uuid, p_comment uuid)
returns void language sql security definer set search_path = public as $$
  delete from notifications where recipient_id = p_to and actor_id = p_from and type = p_type
    and post_id is not distinct from p_post and car_id is not distinct from p_car and comment_id is not distinct from p_comment;
$$;

create or replace function public.is_meet_organizer(p_meet uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from meets where id = p_meet and organizer_id = p_user)
      or exists (select 1 from meet_attendees where meet_id = p_meet and user_id = p_user and role = 'organizer');
$$;

-- ============ triggers: notifications ============
create or replace function public.trg_follows() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from blocks where (blocker_id = new.followee_id and blocked_id = new.follower_id)
                                     or (blocker_id = new.follower_id and blocked_id = new.followee_id)) then
      raise exception 'blocked';
    end if;
    perform notify(new.followee_id, new.follower_id, 'follow', null, null, null, null, null); return new;
  else perform unnotify(old.followee_id, old.follower_id, 'follow', null, null, null); return old; end if;
end $$;
create trigger follows_check before insert on public.follows for each row execute function public.trg_follows();
create or replace function public.trg_follows_after() returns trigger language plpgsql security definer set search_path = public as $$
begin perform unnotify(old.followee_id, old.follower_id, 'follow', null, null, null); return old; end $$;
create trigger follows_unnotify after delete on public.follows for each row execute function public.trg_follows_after();

create or replace function public.trg_post_likes() returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into v_author from posts where id = new.post_id;
    perform notify(v_author, new.user_id, 'like', new.post_id, null, null, null, null); return new;
  else
    select author_id into v_author from posts where id = old.post_id;
    perform unnotify(v_author, old.user_id, 'like', old.post_id, null, null); return old;
  end if;
end $$;
create trigger post_likes_notify after insert or delete on public.post_likes for each row execute function public.trg_post_likes();

create or replace function public.trg_comments() returns trigger language plpgsql security definer set search_path = public as $$
declare v_to uuid;
begin
  if new.parent_id is null then
    select author_id into v_to from posts where id = new.post_id;
    perform notify(v_to, new.author_id, 'comment', new.post_id, null, new.id, null, left(new.text, 60));
  else
    select author_id into v_to from comments where id = new.parent_id;
    perform notify(v_to, new.author_id, 'reply', new.post_id, null, new.id, null, left(new.text, 60));
  end if;
  return new;
end $$;
create trigger comments_notify after insert on public.comments for each row execute function public.trg_comments();

create or replace function public.trg_comment_likes() returns trigger language plpgsql security definer set search_path = public as $$
declare v_to uuid; v_post uuid;
begin
  if tg_op = 'INSERT' then
    select author_id, post_id into v_to, v_post from comments where id = new.comment_id;
    perform notify(v_to, new.user_id, 'commentLike', v_post, null, new.comment_id, null, null); return new;
  else
    select author_id, post_id into v_to, v_post from comments where id = old.comment_id;
    perform unnotify(v_to, old.user_id, 'commentLike', v_post, null, old.comment_id); return old;
  end if;
end $$;
create trigger comment_likes_notify after insert or delete on public.comment_likes for each row execute function public.trg_comment_likes();

create or replace function public.trg_posts_tags() returns trigger language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  foreach t in array new.tags loop
    perform notify(t, new.author_id, 'tag', new.id, null, null, null, null);
  end loop;
  return new;
end $$;
create trigger posts_tags_notify after insert on public.posts for each row execute function public.trg_posts_tags();

create or replace function public.trg_car_follows() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select owner_id into v_owner from cars where id = new.car_id;
    perform notify(v_owner, new.user_id, 'followBuild', null, new.car_id, null, null, null); return new;
  else
    select owner_id into v_owner from cars where id = old.car_id;
    perform unnotify(v_owner, old.user_id, 'followBuild', null, old.car_id, null); return old;
  end if;
end $$;
create trigger car_follows_notify after insert or delete on public.car_follows for each row execute function public.trg_car_follows();

create or replace function public.trg_car_spots() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from cars where id = new.car_id;
  perform notify(v_owner, new.user_id, 'spot', null, new.car_id, null, null, null);
  return new;
end $$;
create trigger car_spots_notify after insert on public.car_spots for each row execute function public.trg_car_spots();

create or replace function public.trg_thread_replies() returns trigger language plpgsql security definer set search_path = public as $$
declare v_to uuid;
begin
  select author_id into v_to from threads where id = new.thread_id;
  perform notify(v_to, new.author_id, 'threadReply', null, null, null, new.thread_id, left(new.text, 60));
  return new;
end $$;
create trigger thread_replies_notify after insert on public.thread_replies for each row execute function public.trg_thread_replies();

-- ============ triggers: rules ============
-- Spotting or following a build needs a public page, and can't be your own car.
create or replace function public.trg_car_public_check() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from cars where id = new.car_id and (owner_id = new.user_id or not has_page)) then
    raise exception 'not allowed for this car';
  end if;
  return new;
end $$;
create trigger car_spots_check before insert on public.car_spots for each row execute function public.trg_car_public_check();
create trigger car_follows_check before insert on public.car_follows for each row execute function public.trg_car_public_check();

-- Meets: the creator is always organizing; only organizers can add organizers; limits are enforced.
create or replace function public.trg_meet_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into meet_attendees (meet_id, user_id, role) values (new.id, new.organizer_id, 'organizer') on conflict do nothing;
  return new;
end $$;
create trigger meets_add_organizer after insert on public.meets for each row execute function public.trg_meet_created();

create or replace function public.trg_meet_rsvp() returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap int; v_count int; v_creator uuid;
begin
  select organizer_id, case new.role when 'driver' then driver_cap when 'attendee' then attendee_cap end
    into v_creator, v_cap from meets where id = new.meet_id;
  if tg_op = 'UPDATE' and old.user_id = v_creator and new.role <> 'organizer' then
    raise exception 'the creator stays organizing';
  end if;
  if new.role = 'organizer' and new.user_id <> v_creator and not is_meet_organizer(new.meet_id, auth.uid()) then
    raise exception 'only organizers can add organizers';
  end if;
  if v_cap is not null and (tg_op = 'INSERT' or old.role <> new.role) then
    select count(*) into v_count from meet_attendees where meet_id = new.meet_id and role = new.role;
    if v_count >= v_cap then raise exception 'full'; end if;
  end if;
  return new;
end $$;
create trigger meet_rsvp_check before insert or update on public.meet_attendees for each row execute function public.trg_meet_rsvp();

create or replace function public.trg_meet_leave() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from meets where id = old.meet_id and organizer_id = old.user_id) then
    raise exception 'the creator stays organizing';
  end if;
  return old;
end $$;
create trigger meet_leave_check before delete on public.meet_attendees for each row
  when (pg_trigger_depth() = 0) execute function public.trg_meet_leave();

-- Blocking someone also unfollows both ways.
create or replace function public.trg_blocks() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from follows where (follower_id = new.blocker_id and followee_id = new.blocked_id)
                         or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end $$;
create trigger blocks_unfollow after insert on public.blocks for each row execute function public.trg_blocks();

-- ============ accounts ============
-- Sign-up: make the profile from the handle + name given at sign-up.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, handle, name)
  values (new.id, lower(new.raw_user_meta_data->>'handle'), coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where handle = lower(p_handle)::citext);
$$;
grant execute on function public.handle_available(text) to anon, authenticated;

-- Delete my account: removes the login and everything of mine (it all cascades).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke execute on function public.notify(uuid, uuid, text, uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.unnotify(uuid, uuid, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ============ Row Level Security ============
do $$ declare t text;
begin
  foreach t in array array['profiles','follows','blocks','cars','car_mods','car_follows','car_spots','sightings','communities',
    'community_members','threads','thread_replies','thread_likes','posts','post_likes','hidden_posts','comments','comment_likes',
    'car_events','meets','meet_attendees','news_likes','reports','notifications'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Reading: anyone signed in.
do $$ declare t text;
begin
  foreach t in array array['profiles','follows','cars','car_mods','car_follows','car_spots','sightings','communities',
    'community_members','threads','thread_replies','thread_likes','post_likes','comments','comment_likes','car_events',
    'meets','meet_attendees','news_likes'] loop
    execute format('create policy "read" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;
create policy "read" on public.posts for select to authenticated using (not archived or author_id = (select auth.uid()));
create policy "read own" on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy "read own" on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "read own" on public.hidden_posts for select to authenticated using (user_id = (select auth.uid()));

-- Profiles: you edit only your own name/bio/photo. Handles never change.
revoke update on public.profiles from anon, authenticated;
grant update (name, bio, avatar_url) on public.profiles to authenticated;
create policy "edit own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- "Mine" rows: insert/delete only as yourself.
create policy "as me" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "undo" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));
create policy "as me" on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "undo" on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));
create policy "as me" on public.hidden_posts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.hidden_posts for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.car_follows for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.car_follows for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.car_spots for insert to authenticated with check (user_id = (select auth.uid()));
create policy "as me" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.comment_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.comment_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.thread_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.thread_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.news_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.news_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.community_members for insert to authenticated with check (user_id = (select auth.uid()));
create policy "undo" on public.community_members for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Owned things: create/edit/delete only your own.
create policy "add" on public.cars for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "edit" on public.cars for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "remove" on public.cars for delete to authenticated using (owner_id = (select auth.uid()));
create policy "owner adds" on public.car_mods for insert to authenticated
  with check (exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid())));
create policy "owner removes" on public.car_mods for delete to authenticated
  using (exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid())));
create policy "add" on public.car_events for insert to authenticated with check (
  actor_id = (select auth.uid()) and (type in ('spot', 'post', 'followBuild')
    or exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid()))));
create policy "remove own" on public.car_events for delete to authenticated using (actor_id = (select auth.uid()));
create policy "add" on public.sightings for insert to authenticated with check (spotter_id = (select auth.uid()));
create policy "remove" on public.sightings for delete to authenticated using (spotter_id = (select auth.uid()));

create policy "add" on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()) or (kind = 'brand' and created_by is null));
create policy "edit" on public.communities for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "remove" on public.communities for delete to authenticated using (created_by = (select auth.uid()));
create policy "add" on public.threads for insert to authenticated with check (author_id = (select auth.uid()));
create policy "edit" on public.threads for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "remove" on public.threads for delete to authenticated using (author_id = (select auth.uid()));
create policy "add" on public.thread_replies for insert to authenticated with check (author_id = (select auth.uid()));
create policy "remove" on public.thread_replies for delete to authenticated using (author_id = (select auth.uid()));

create policy "add" on public.posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "edit" on public.posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "remove" on public.posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "add" on public.comments for insert to authenticated with check (author_id = (select auth.uid()));
create policy "remove" on public.comments for delete to authenticated using (author_id = (select auth.uid()));

create policy "add" on public.meets for insert to authenticated with check (organizer_id = (select auth.uid()));
create policy "edit" on public.meets for update to authenticated using (organizer_id = (select auth.uid())) with check (organizer_id = (select auth.uid()));
create policy "remove" on public.meets for delete to authenticated using (organizer_id = (select auth.uid()));
-- RSVP: yourself, or anyone if you're an organizer (manage people).
create policy "rsvp" on public.meet_attendees for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_meet_organizer(meet_id, (select auth.uid())));
create policy "change" on public.meet_attendees for update to authenticated
  using (user_id = (select auth.uid()) or public.is_meet_organizer(meet_id, (select auth.uid())))
  with check (user_id = (select auth.uid()) or public.is_meet_organizer(meet_id, (select auth.uid())));
create policy "leave" on public.meet_attendees for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_meet_organizer(meet_id, (select auth.uid())));

create policy "mark read" on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

-- ============ indexes for lookups ============
create index on public.cars (owner_id);
create index on public.car_mods (car_id);
create index on public.car_events (car_id);
create index on public.car_events (actor_id);
create index on public.car_events (post_id);
create index on public.car_follows (user_id);
create index on public.car_spots (user_id);
create index on public.sightings (spotter_id);
create index on public.sightings (matched_car_id);
create index on public.communities (created_by);
create index on public.community_members (user_id);
create index on public.threads (community_id);
create index on public.threads (author_id);
create index on public.thread_replies (thread_id);
create index on public.thread_replies (author_id);
create index on public.thread_likes (user_id);
create index on public.posts (author_id);
create index on public.posts (car_id);
create index on public.posts (community_id);
create index on public.post_likes (user_id);
create index on public.hidden_posts (post_id);
create index on public.comments (post_id);
create index on public.comments (author_id);
create index on public.comments (parent_id);
create index on public.comment_likes (user_id);
create index on public.meets (organizer_id);
create index on public.meet_attendees (user_id);
create index on public.news_likes (user_id);
create index on public.reports (reporter_id);
create index on public.notifications (actor_id);
create index on public.notifications (post_id);
create index on public.notifications (car_id);
create index on public.notifications (comment_id);
create index on public.notifications (thread_id);
create index on public.follows (followee_id);
create index on public.blocks (blocked_id);

-- ============ photo storage ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
-- Upload, list and delete only inside your own folder: photos/<your user id>/...
create policy "upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "list own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
