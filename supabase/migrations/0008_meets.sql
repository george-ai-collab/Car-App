-- Meets, round 2: end time, Free/Pro plans (no payments yet), cars at the meet, check-in,
-- announcements, spotting at a meet, views for stats.

alter table public.meets
  add column ends_at text check (ends_at is null or ends_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
  add column plan text not null default 'free' check (plan in ('free', 'pro')),
  add column recurring text not null default 'none' check (recurring in ('none', 'weekly')),
  add column approve_drivers boolean not null default false,
  add column featured boolean not null default false,
  add column driver_note text not null default '' check (char_length(driver_note) <= 300);

alter table public.meet_attendees
  add column car_id uuid references public.cars(id) on delete set null,
  add column approved boolean not null default true,
  add column checked_in_at timestamptz;

alter table public.profiles add column verified boolean not null default false; -- verified clubs/shops (set by you in the dashboard)

-- Free plan limits. Pro has none (payments come later).
create or replace function public.trg_meet_plan() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan = 'free' then
    if cardinality(new.sponsors) > 0 then raise exception 'pro only: sponsors'; end if;
    if new.recurring <> 'none' then raise exception 'pro only: repeating meets'; end if;
    if new.approve_drivers then raise exception 'pro only: approve drivers'; end if;
    if new.featured then raise exception 'pro only: featured'; end if;
    if coalesce(new.driver_cap, 0) + coalesce(new.attendee_cap, 0) > 50 then raise exception 'free plan: up to 50 people'; end if;
  end if;
  return new;
end $$;
revoke execute on function public.trg_meet_plan() from public, anon, authenticated;
create trigger meets_plan before insert or update on public.meets for each row execute function public.trg_meet_plan();

-- RSVP rules, now with: Free = up to 50 people and 1 co-organizer; drivers wait for approval when
-- the organizer turned that on; your car must be yours.
create or replace function public.trg_meet_rsvp() returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap int; v_count int; m meets%rowtype; v_org bool;
begin
  select * into m from meets where id = new.meet_id;
  v_org := is_meet_organizer(new.meet_id, auth.uid());
  if tg_op = 'UPDATE' and old.user_id = m.organizer_id and new.role <> 'organizer' then raise exception 'the creator stays organizing'; end if;
  if new.role = 'organizer' and new.user_id <> m.organizer_id and not v_org then raise exception 'only organizers can add organizers'; end if;
  if new.car_id is not null and not exists (select 1 from cars where id = new.car_id and owner_id = new.user_id) then raise exception 'not your car'; end if;
  -- only organizers can approve or check people in
  if tg_op = 'UPDATE' and not v_org and (new.approved is distinct from old.approved or new.checked_in_at is distinct from old.checked_in_at) then raise exception 'organizers only'; end if;
  if tg_op = 'INSERT' and new.role = 'driver' and m.approve_drivers and not v_org then new.approved := false; end if;
  if tg_op = 'UPDATE' and new.role = 'driver' and old.role <> 'driver' and m.approve_drivers and not v_org then new.approved := false; end if;
  if tg_op = 'INSERT' or old.role <> new.role then
    v_cap := case new.role when 'driver' then m.driver_cap when 'attendee' then m.attendee_cap end;
    if v_cap is not null then
      select count(*) into v_count from meet_attendees where meet_id = new.meet_id and role = new.role;
      if v_count >= v_cap then raise exception 'full'; end if;
    end if;
    if m.plan = 'free' then
      if new.role = 'organizer' and new.user_id <> m.organizer_id then
        select count(*) into v_count from meet_attendees where meet_id = new.meet_id and role = 'organizer' and user_id <> m.organizer_id;
        if v_count >= 1 then raise exception 'free plan: 1 co-organizer'; end if;
      end if;
      if new.role <> 'organizer' then
        select count(*) into v_count from meet_attendees where meet_id = new.meet_id and role <> 'organizer';
        if v_count >= 50 then raise exception 'full'; end if;
      end if;
    end if;
  end if;
  return new;
end $$;

-- Announcements to everyone going. Free: 1 per meet.
create table public.meet_announcements (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index on public.meet_announcements (meet_id);
create index on public.meet_announcements (author_id);
alter table public.meet_announcements enable row level security;
create policy "read" on public.meet_announcements for select to authenticated using (true);
create policy "organizers post" on public.meet_announcements for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_meet_organizer(meet_id, (select auth.uid())));
create policy "organizers remove" on public.meet_announcements for delete to authenticated
  using (public.is_meet_organizer(meet_id, (select auth.uid())));
create trigger meet_announcements_clean before insert on public.meet_announcements for each row execute function public.trg_clean_text('text');

alter table public.notifications add column meet_id uuid references public.meets(id) on delete cascade;
create index on public.notifications (meet_id);
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('like', 'comment', 'reply', 'follow', 'spot', 'followBuild', 'commentLike', 'tag', 'threadReply', 'meetUpdate'));

create or replace function public.trg_meet_announcement() returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_n int; a record;
begin
  select plan into v_plan from meets where id = new.meet_id;
  if v_plan = 'free' then
    select count(*) into v_n from meet_announcements where meet_id = new.meet_id;
    if v_n >= 1 then raise exception 'free plan: 1 announcement'; end if;
  end if;
  -- Pro: at most 1 every 10 minutes, so nobody gets spammed
  if exists (select 1 from meet_announcements where meet_id = new.meet_id and created_at > now() - interval '10 minutes') then raise exception 'wait a few minutes'; end if;
  return new;
end $$;
revoke execute on function public.trg_meet_announcement() from public, anon, authenticated;
create trigger meet_announcements_rules before insert on public.meet_announcements for each row execute function public.trg_meet_announcement();

create or replace function public.trg_meet_announcement_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select user_id from meet_attendees where meet_id = new.meet_id and user_id <> new.author_id loop
    if not exists (select 1 from blocks where blocker_id = a.user_id and blocked_id = new.author_id) then
      insert into notifications (recipient_id, actor_id, type, meet_id, text) values (a.user_id, new.author_id, 'meetUpdate', new.meet_id, left(new.text, 60));
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.trg_meet_announcement_notify() from public, anon, authenticated;
create trigger meet_announcements_notify after insert on public.meet_announcements for each row execute function public.trg_meet_announcement_notify();

-- Spotting a car at a meet. Scanned (its tag) = verified.
create table public.meet_spots (
  meet_id uuid not null references public.meets(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (meet_id, car_id, user_id)
);
create index on public.meet_spots (car_id);
create index on public.meet_spots (user_id);
alter table public.meet_spots enable row level security;
create policy "read" on public.meet_spots for select to authenticated using (true);
create policy "as me" on public.meet_spots for insert to authenticated with check (user_id = (select auth.uid()));
create policy "upgrade to scanned" on public.meet_spots for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger meet_spots_personal_only before insert on public.meet_spots for each row execute function public.trg_personal_only();
create trigger meet_spots_not_banned before insert on public.meet_spots for each row execute function public.trg_not_banned();

-- Views (one per person) for Pro stats.
create table public.meet_views (
  meet_id uuid not null references public.meets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meet_id, user_id)
);
create index on public.meet_views (user_id);
alter table public.meet_views enable row level security;
create policy "as me" on public.meet_views for insert to authenticated with check (user_id = (select auth.uid()));
create policy "organizers read" on public.meet_views for select to authenticated using (public.is_meet_organizer(meet_id, (select auth.uid())));
