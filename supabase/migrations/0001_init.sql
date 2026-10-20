-- Carfooly database: tables, security rules (RLS), and automatic notifications.
-- Every table has Row Level Security on: anyone signed in can read, but you can only
-- create/change/delete your own things. Notifications are made by the database itself.

create extension if not exists citext;

-- ---------- people ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext not null unique check (handle::text ~ '^[a-z0-9_.]{2,24}$'),  -- always lowercase
  name text not null default '' check (char_length(name) <= 40),
  bio text not null default '' check (char_length(bio) <= 150),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),            -- you can only follow someone once
  check (follower_id <> followee_id)                  -- and never yourself
);

-- ---------- cars ----------
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
  make text not null, model text not null, year text not null, trim text not null default '',
  photo_url text,
  matched_car_id uuid references public.cars(id) on delete set null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- communities ----------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  description text not null default '' check (char_length(description) <= 200),
  kind text not null default 'custom' check (kind in ('brand', 'custom')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index communities_name_unique on public.communities (lower(btrim(name)));  -- one community per name, any capitals

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- ---------- posts ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid references public.cars(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  photo_url text,
  photo_aspect real,
  caption text not null default '' check (char_length(caption) <= 280),
  archived boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index posts_created on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,  -- set = a reply
  text text not null check (char_length(text) between 1 and 220),
  created_at timestamptz not null default now()
);

-- ---------- meets ----------
create table public.meets (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  location text not null check (char_length(location) between 1 and 160),
  lat double precision, lng double precision,
  starts_at text not null check (starts_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),  -- local time as picked
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create table public.meet_attendees (
  meet_id uuid not null references public.meets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer', 'driver', 'attendee')),
  primary key (meet_id, user_id)                      -- one role per person per meet
);

create table public.news_likes (
  news_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (news_id, user_id)
);

-- ---------- notifications (written only by the database) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'reply', 'follow', 'spot', 'followBuild')),
  post_id uuid references public.posts(id) on delete cascade,
  car_id uuid references public.cars(id) on delete cascade,
  text text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_recipient on public.notifications (recipient_id, created_at desc);
-- Follow / like / follow-build / spot: at most ONE notification per person per thing.
create unique index notifications_once on public.notifications
  (recipient_id, actor_id, type, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(car_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where type in ('follow', 'like', 'followBuild', 'spot');

create or replace function public.notify(p_recipient uuid, p_actor uuid, p_type text, p_post uuid, p_car uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;  -- never notify yourself
  if p_type in ('follow', 'like', 'followBuild', 'spot') then
    insert into notifications (recipient_id, actor_id, type, post_id, car_id, text)
    values (p_recipient, p_actor, p_type, p_post, p_car, p_text)
    on conflict (recipient_id, actor_id, type, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(car_id, '00000000-0000-0000-0000-000000000000'::uuid))
      where type in ('follow', 'like', 'followBuild', 'spot')
    do update set created_at = now(), read = false;
  else
    insert into notifications (recipient_id, actor_id, type, post_id, car_id, text)
    values (p_recipient, p_actor, p_type, p_post, p_car, p_text);
  end if;
end $$;

create or replace function public.unnotify(p_recipient uuid, p_actor uuid, p_type text, p_post uuid, p_car uuid)
returns void language sql security definer set search_path = public as $$
  delete from notifications where recipient_id = p_recipient and actor_id = p_actor and type = p_type
    and post_id is not distinct from p_post and car_id is not distinct from p_car;
$$;

create or replace function public.trg_follows() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then perform notify(new.followee_id, new.follower_id, 'follow', null, null, null); return new;
  else perform unnotify(old.followee_id, old.follower_id, 'follow', null, null); return old; end if;
end $$;
create trigger follows_notify after insert or delete on public.follows for each row execute function public.trg_follows();

create or replace function public.trg_post_likes() returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into v_author from posts where id = new.post_id;
    perform notify(v_author, new.user_id, 'like', new.post_id, null, null); return new;
  else
    select author_id into v_author from posts where id = old.post_id;
    perform unnotify(v_author, old.user_id, 'like', old.post_id, null); return old;
  end if;
end $$;
create trigger post_likes_notify after insert or delete on public.post_likes for each row execute function public.trg_post_likes();

create or replace function public.trg_comments() returns trigger language plpgsql security definer set search_path = public as $$
declare v_to uuid;
begin
  if new.parent_id is null then
    select author_id into v_to from posts where id = new.post_id;
    perform notify(v_to, new.author_id, 'comment', new.post_id, null, left(new.text, 60));
  else
    select author_id into v_to from comments where id = new.parent_id;
    perform notify(v_to, new.author_id, 'reply', new.post_id, null, left(new.text, 60));
  end if;
  return new;
end $$;
create trigger comments_notify after insert on public.comments for each row execute function public.trg_comments();

create or replace function public.trg_car_follows() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select owner_id into v_owner from cars where id = new.car_id;
    perform notify(v_owner, new.user_id, 'followBuild', null, new.car_id, null); return new;
  else
    select owner_id into v_owner from cars where id = old.car_id;
    perform unnotify(v_owner, old.user_id, 'followBuild', null, old.car_id); return old;
  end if;
end $$;
create trigger car_follows_notify after insert or delete on public.car_follows for each row execute function public.trg_car_follows();

create or replace function public.trg_car_spots() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from cars where id = new.car_id;
  perform notify(v_owner, new.user_id, 'spot', null, new.car_id, null);
  return new;
end $$;
create trigger car_spots_notify after insert on public.car_spots for each row execute function public.trg_car_spots();

-- Spotting your own car, or a car without a page, isn't allowed.
create or replace function public.trg_car_spots_check() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from cars where id = new.car_id and (owner_id = new.user_id or not has_page)) then
    raise exception 'cannot spot this car';
  end if;
  return new;
end $$;
create trigger car_spots_check before insert on public.car_spots for each row execute function public.trg_car_spots_check();

-- Following a build needs a public page and can't be your own car.
create or replace function public.trg_car_follows_check() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from cars where id = new.car_id and (owner_id = new.user_id or not has_page)) then
    raise exception 'cannot follow this build';
  end if;
  return new;
end $$;
create trigger car_follows_check before insert on public.car_follows for each row execute function public.trg_car_follows_check();

-- ---------- sign-up: make the profile from the handle + name given at sign-up ----------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, handle, name)
  values (new.id, lower(new.raw_user_meta_data->>'handle'), coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Is a handle free? (callable before signing up)
create or replace function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where handle = p_handle::citext);
$$;
grant execute on function public.handle_available(text) to anon, authenticated;

-- Delete my account: removes the login, and everything of mine with it (cascades).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Internal helpers are not callable from the app.
revoke execute on function public.notify(uuid, uuid, text, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.unnotify(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.cars enable row level security;
alter table public.car_mods enable row level security;
alter table public.car_follows enable row level security;
alter table public.car_spots enable row level security;
alter table public.sightings enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.meets enable row level security;
alter table public.meet_attendees enable row level security;
alter table public.news_likes enable row level security;
alter table public.notifications enable row level security;

-- Reading: anyone signed in. (Archived posts: only their author.)
create policy "read" on public.profiles for select to authenticated using (true);
create policy "read" on public.follows for select to authenticated using (true);
create policy "read" on public.cars for select to authenticated using (true);
create policy "read" on public.car_mods for select to authenticated using (true);
create policy "read" on public.car_follows for select to authenticated using (true);
create policy "read" on public.car_spots for select to authenticated using (true);
create policy "read" on public.sightings for select to authenticated using (true);
create policy "read" on public.communities for select to authenticated using (true);
create policy "read" on public.community_members for select to authenticated using (true);
create policy "read" on public.posts for select to authenticated using (not archived or author_id = (select auth.uid()));
create policy "read" on public.post_likes for select to authenticated using (true);
create policy "read" on public.comments for select to authenticated using (true);
create policy "read" on public.meets for select to authenticated using (true);
create policy "read" on public.meet_attendees for select to authenticated using (true);
create policy "read" on public.news_likes for select to authenticated using (true);
create policy "read own" on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));

-- Writing: only your own rows. (Handles can't be changed after sign-up.)
revoke update on public.profiles from anon, authenticated;
grant update (name, bio, avatar_url) on public.profiles to authenticated;
create policy "update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "follow as me" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "unfollow as me" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

create policy "add own" on public.cars for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "edit own" on public.cars for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own" on public.cars for delete to authenticated using (owner_id = (select auth.uid()));

create policy "owner adds" on public.car_mods for insert to authenticated
  with check (exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid())));
create policy "owner deletes" on public.car_mods for delete to authenticated
  using (exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid())));

create policy "as me" on public.car_follows for insert to authenticated with check (user_id = (select auth.uid()));
create policy "as me" on public.car_follows for delete to authenticated using (user_id = (select auth.uid()));
create policy "as me" on public.car_spots for insert to authenticated with check (user_id = (select auth.uid()));
create policy "as me" on public.sightings for insert to authenticated with check (spotter_id = (select auth.uid()));
create policy "delete own" on public.sightings for delete to authenticated using (spotter_id = (select auth.uid()));

create policy "create" on public.communities for insert to authenticated with check (created_by = (select auth.uid()) or (kind = 'brand' and created_by is null));
create policy "edit own" on public.communities for update to authenticated using (created_by = (select auth.uid()));
create policy "delete own" on public.communities for delete to authenticated using (created_by = (select auth.uid()));
create policy "join as me" on public.community_members for insert to authenticated with check (user_id = (select auth.uid()));
create policy "leave as me" on public.community_members for delete to authenticated using (user_id = (select auth.uid()));

create policy "post as me" on public.posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "edit own" on public.posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "delete own" on public.posts for delete to authenticated using (author_id = (select auth.uid()));

create policy "like as me" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "unlike as me" on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "comment as me" on public.comments for insert to authenticated with check (author_id = (select auth.uid()));
create policy "delete own" on public.comments for delete to authenticated using (author_id = (select auth.uid()));

create policy "organize as me" on public.meets for insert to authenticated with check (organizer_id = (select auth.uid()));
create policy "edit own" on public.meets for update to authenticated using (organizer_id = (select auth.uid())) with check (organizer_id = (select auth.uid()));
create policy "delete own" on public.meets for delete to authenticated using (organizer_id = (select auth.uid()));

create policy "rsvp as me" on public.meet_attendees for insert to authenticated with check (user_id = (select auth.uid()));
create policy "change rsvp" on public.meet_attendees for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "cancel rsvp" on public.meet_attendees for delete to authenticated using (user_id = (select auth.uid()));

create policy "like as me" on public.news_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "unlike as me" on public.news_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "mark read" on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

-- Indexes for the foreign keys we filter by.
create index on public.cars (owner_id);
create index on public.car_mods (car_id);
create index on public.car_follows (user_id);
create index on public.car_spots (user_id);
create index on public.sightings (spotter_id);
create index on public.sightings (matched_car_id);
create index on public.communities (created_by);
create index on public.community_members (user_id);
create index on public.posts (author_id);
create index on public.posts (car_id);
create index on public.posts (community_id);
create index on public.post_likes (user_id);
create index on public.comments (post_id);
create index on public.comments (author_id);
create index on public.comments (parent_id);
create index on public.meets (organizer_id);
create index on public.meet_attendees (user_id);
create index on public.news_likes (user_id);
create index on public.notifications (actor_id);
create index on public.notifications (post_id);
create index on public.notifications (car_id);
create index on public.follows (followee_id);

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Upload/delete only inside your own folder: photos/<your user id>/...
create policy "upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "list own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
