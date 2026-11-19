-- Accounts: change your handle, and Google sign-in.
alter table public.profiles
  add column if not exists handle_changed_at timestamptz,
  add column if not exists needs_handle boolean not null default false;

-- An old handle stays held for 30 days after someone changes it, so nobody can grab it
-- straight away and pretend to be them.
create table if not exists public.retired_handles (
  handle text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  until timestamptz not null
);
alter table public.retired_handles enable row level security; -- no policies: only the functions below use it

create or replace function public.handle_status(p_handle text) returns text
language plpgsql stable security definer set search_path = public as $$
declare h text := lower(btrim(coalesce(p_handle, ''))); core text; j text;
begin
  if h !~ '^[a-z0-9_.]{2,24}$' then return 'invalid'; end if;
  core := replace(replace(h, '_', ''), '.', '');
  if exists (select 1 from reserved_handles r where core in (r.handle, r.handle || 'official', 'official' || r.handle, 'the' || r.handle, r.handle || 'app')) then return 'reserved'; end if;
  j := regexp_replace(norm_text(h), '[^a-z]', '', 'g');
  if exists (select 1 from banned_words b where b.mode = 'any' and b.word ~ '[a-z]' and position(regexp_replace(norm_text(b.word), '[^a-z]', '', 'g') in j) > 0) then return 'not_allowed'; end if;
  if find_banned(translate(h, '_.', '  ')) is not null then return 'not_allowed'; end if;
  if exists (select 1 from profiles where handle = h) then return 'taken'; end if;
  if exists (select 1 from retired_handles where handle = h and until > now() and user_id is distinct from auth.uid()) then return 'taken'; end if;
  return 'ok';
end $$;

-- New accounts. Google sign-ups come without a handle: they get a temporary one and the app
-- asks them to pick theirs.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare h text := lower(new.raw_user_meta_data->>'handle'); st text; pick boolean := false;
begin
  if h is null or h = '' then
    h := 'driver_' || substr(replace(new.id::text, '-', ''), 1, 10);
    pick := true;
  else
    st := handle_status(h);
    if st in ('reserved', 'not_allowed', 'invalid') then raise exception 'handle %', st; end if;
  end if;
  insert into profiles (id, handle, name, needs_handle)
  values (new.id, h, left(coalesce(nullif(new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'full_name', ''), 40), pick);
  return new;
end $$;

-- Change your handle: must be free, and once every 30 days (picking your first one is free).
-- Returns 'ok', 'too_soon', or why the handle can't be used.
create or replace function public.change_handle(p_handle text) returns text
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); h text := lower(btrim(coalesce(p_handle, ''))); st text; r profiles%rowtype;
begin
  if v_me is null then return 'invalid'; end if;
  select * into r from profiles where id = v_me;
  if r.id is null then return 'invalid'; end if;
  if r.handle = h then return 'ok'; end if;
  if not r.needs_handle and r.handle_changed_at is not null and r.handle_changed_at > now() - interval '30 days' then return 'too_soon'; end if;
  st := handle_status(h);
  if st <> 'ok' then return st; end if;
  if not r.needs_handle then
    insert into retired_handles (handle, user_id, until) values (r.handle, v_me, now() + interval '30 days')
    on conflict (handle) do update set user_id = excluded.user_id, until = excluded.until;
  end if;
  delete from retired_handles where handle = h;
  update profiles set handle = h, needs_handle = false,
    handle_changed_at = case when r.needs_handle then null else now() end
  where id = v_me;
  return 'ok';
exception when unique_violation then return 'taken';
end $$;
revoke execute on function public.change_handle(text) from public, anon;
grant execute on function public.change_handle(text) to authenticated;
