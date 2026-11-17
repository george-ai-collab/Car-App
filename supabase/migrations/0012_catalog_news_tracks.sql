-- Car list (makes and models people pick from), live news from RSS feeds, and race tracks.

-- ============ car makes and models ============
-- Filled from the US government's free vehicle database (NHTSA vPIC, public domain) plus Gulf models added by hand.
create table public.car_makes (
  name text primary key check (char_length(name) between 1 and 30),
  popular int not null default 0,          -- higher shows first
  created_at timestamptz not null default now()
);
create table public.car_models (
  make text not null references public.car_makes(name) on update cascade on delete cascade,
  model text not null check (char_length(model) between 1 and 40),
  source text not null default 'vpic' check (source in ('vpic', 'gulf', 'request')),
  primary key (make, model)
);
create index car_models_make_lower on public.car_models (lower(make), lower(model));

-- "My car isn't in the list": people ask, an admin adds it.
create table public.car_model_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  make text not null check (char_length(make) between 1 and 30),
  model text not null check (char_length(model) between 1 and 40),
  year text not null default '' check (year = '' or year ~ '^[0-9]{4}$'),
  status text not null default 'open' check (status in ('open', 'added', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.car_makes enable row level security;
alter table public.car_models enable row level security;
alter table public.car_model_requests enable row level security;
create policy "car makes: anyone reads" on public.car_makes for select using (true);
create policy "car models: anyone reads" on public.car_models for select using (true);
create policy "car requests: ask" on public.car_model_requests for insert to authenticated with check (user_id = auth.uid());
create policy "car requests: see own or admin" on public.car_model_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Admins: add a requested car to the list (or turn the request down).
create or replace function public.resolve_car_request(p_id uuid, p_add boolean, p_make text default null, p_model text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r car_model_requests;
begin
  if not is_admin() then raise exception 'admins only'; end if;
  select * into r from car_model_requests where id = p_id;
  if not found then return; end if;
  if p_add then
    insert into car_makes (name) values (coalesce(nullif(trim(p_make), ''), r.make)) on conflict do nothing;
    insert into car_models (make, model, source) values (coalesce(nullif(trim(p_make), ''), r.make), coalesce(nullif(trim(p_model), ''), r.model), 'request') on conflict do nothing;
  end if;
  update car_model_requests set status = case when p_add then 'added' else 'rejected' end where id = p_id;
end $$;
revoke execute on function public.resolve_car_request(uuid, boolean, text, text) from public, anon;
grant execute on function public.resolve_car_request(uuid, boolean, text, text) to authenticated;

-- New cars (and changes to make/model) must be a real make and model from the list.
-- Existing cars are left as they are. Spelling is fixed to the list's spelling.
create or replace function public.trg_car_in_catalog() returns trigger language plpgsql security definer set search_path = public as $$
declare mk text; md text;
begin
  if tg_op = 'UPDATE' and new.make is not distinct from old.make and new.model is not distinct from old.model then return new; end if;
  select m.make, m.model into mk, md from car_models m where lower(m.make) = lower(trim(new.make)) and lower(m.model) = lower(trim(new.model)) limit 1;
  if mk is null then raise exception 'unknown car model'; end if;
  new.make := mk; new.model := md;
  if new.year !~ '^[0-9]{4}$' or new.year::int < 1900 or new.year::int > extract(year from now())::int + 1 then raise exception 'unknown car model'; end if;
  return new;
end $$;
revoke execute on function public.trg_car_in_catalog() from public, anon, authenticated;
create trigger cars_in_catalog before insert or update of make, model on public.cars
  for each row execute function public.trg_car_in_catalog();

-- ============ news (headlines and links from RSS feeds; filled by the news-refresh function) ============
create table public.news_items (
  id text primary key,                     -- short hash of the link
  url text not null unique,
  title text not null,
  source text not null,
  summary text not null default '',
  image text,
  category text not null check (category in ('general', 'racing', 'gulf')),
  lang text not null default 'en' check (lang in ('en', 'ar')),
  published_at timestamptz not null,
  fetched_at timestamptz not null default now()
);
create index news_items_recent on public.news_items (published_at desc);
create table public.news_meta (id int primary key default 1 check (id = 1), last_fetch timestamptz not null);
alter table public.news_items enable row level security;
alter table public.news_meta enable row level security;
create policy "news: anyone reads" on public.news_items for select using (true);
create policy "news meta: anyone reads" on public.news_meta for select using (true);

-- ============ race tracks ============
create table public.tracks (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('circuit', 'drag', 'karting', 'offroad')),
  city text not null default '',
  country text not null,
  lat double precision not null,
  lng double precision not null,
  website text not null default '',
  about text not null default '',
  created_at timestamptz not null default now()
);
alter table public.tracks enable row level security;
create policy "tracks: anyone reads" on public.tracks for select using (true);
