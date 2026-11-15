-- Meet tickets: everyone going to a meet gets a ticket with its own code (like K7QM-2XAP).
-- The QR on the ticket holds the meet and the code; organizers scan it (or type the code) to check people in.
-- Codes are random and only readable by their owner, so a ticket can't be made up from someone's handle.

create or replace function public.new_ticket_code() returns text language plpgsql volatile set search_path = public as $$
declare abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/L
  b bytea := extensions.gen_random_bytes(8); out text := ''; i int;
begin
  for i in 0..7 loop
    out := out || substr(abc, (get_byte(b, i) % length(abc)) + 1, 1);
    if i = 3 then out := out || '-'; end if;
  end loop;
  return out;
end $$;

create table public.meet_tickets (
  meet_id uuid not null,
  user_id uuid not null,
  code text not null unique default public.new_ticket_code(),
  created_at timestamptz not null default now(),
  primary key (meet_id, user_id),
  foreign key (meet_id, user_id) references public.meet_attendees(meet_id, user_id) on delete cascade
);
alter table public.meet_tickets enable row level security;
create policy "my tickets" on public.meet_tickets for select to authenticated using (user_id = (select auth.uid()));

-- Everyone who joins a meet gets a ticket; existing attendees get one now.
create or replace function public.trg_meet_ticket() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into meet_tickets (meet_id, user_id) values (new.meet_id, new.user_id) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.trg_meet_ticket() from public, anon, authenticated;
create trigger meet_attendees_ticket after insert on public.meet_attendees for each row execute function public.trg_meet_ticket();
insert into public.meet_tickets (meet_id, user_id) select meet_id, user_id from public.meet_attendees on conflict do nothing;

-- Organizers: check someone in by their ticket code.
-- Returns { status: 'ok' | 'already' | 'unknown' | 'waiting', handle }.
create or replace function public.check_in_ticket(p_meet uuid, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare t meet_tickets; a meet_attendees; h text;
begin
  if not is_meet_organizer(p_meet, auth.uid()) then raise exception 'organizers only'; end if;
  select * into t from meet_tickets where meet_id = p_meet and code = upper(replace(trim(p_code), ' ', ''));
  if not found then
    -- codes typed without the dash
    select * into t from meet_tickets where meet_id = p_meet and replace(code, '-', '') = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  end if;
  if not found then return json_build_object('status', 'unknown'); end if;
  select * into a from meet_attendees where meet_id = p_meet and user_id = t.user_id;
  select handle into h from profiles where id = t.user_id;
  if a.role = 'driver' and a.approved = false then return json_build_object('status', 'waiting', 'handle', h); end if;
  if a.checked_in_at is not null then return json_build_object('status', 'already', 'handle', h); end if;
  update meet_attendees set checked_in_at = now() where meet_id = p_meet and user_id = t.user_id;
  return json_build_object('status', 'ok', 'handle', h);
end $$;
revoke execute on function public.check_in_ticket(uuid, text) from public, anon;
grant execute on function public.check_in_ticket(uuid, text) to authenticated;
