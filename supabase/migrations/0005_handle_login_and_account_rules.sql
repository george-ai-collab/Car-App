-- Log in with a handle: the "login" Edge Function counts wrong passwords here (only it can read/write).
create table public.login_attempts (
  id bigint generated always as identity primary key,
  handle text not null,
  created_at timestamptz not null default now()
);
create index login_attempts_handle on public.login_attempts (handle, created_at desc);
alter table public.login_attempts enable row level security; -- no policies: app users can't touch it

-- Clubs and businesses don't keep cars or log spots (those are for drivers).
create or replace function public.trg_personal_only() returns trigger language plpgsql security definer set search_path = public as $$
declare v_type text; v_user uuid;
begin
  v_user := case tg_table_name when 'cars' then new.owner_id when 'sightings' then new.spotter_id else new.user_id end;
  select account_type into v_type from profiles where id = v_user;
  if v_type is distinct from 'personal' then raise exception 'drivers only'; end if;
  return new;
end $$;
revoke execute on function public.trg_personal_only() from public, anon, authenticated;
create trigger cars_personal_only before insert on public.cars for each row execute function public.trg_personal_only();
create trigger sightings_personal_only before insert on public.sightings for each row execute function public.trg_personal_only();
create trigger car_spots_personal_only before insert on public.car_spots for each row execute function public.trg_personal_only();
