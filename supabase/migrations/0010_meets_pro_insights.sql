-- Meets: every meet gets the Pro tools during beta, plus what organizer insights need.

-- 1. Pro for everyone (payments come later). New meets are Pro, and existing ones switch over.
alter table public.meets alter column plan set default 'pro';
update public.meets set plan = 'pro' where plan = 'free';

-- 2. Meet rules: shown on the meet page; people agree to them when they say they're going.
alter table public.meets add column rules text not null default '' check (char_length(rules) <= 500);
drop trigger if exists meets_clean on public.meets;
create trigger meets_clean before insert or update on public.meets
  for each row execute function public.trg_clean_text('title', 'note', 'location', 'rules', 'driver_note');

-- 3. When someone said they're going (for "RSVPs over time").
alter table public.meet_attendees add column joined_at timestamptz not null default now();

-- 4. Where a meet page view came from (feed, Meets list, Discover, a scanned tag, a shared link…).
alter table public.meet_views add column source text not null default 'other'
  check (source in ('feed', 'meets', 'discover', 'profile', 'tag', 'link', 'notification', 'search', 'other'));

-- 5. Announcements can go to everyone going, or to drivers only.
alter table public.meet_announcements add column audience text not null default 'all' check (audience in ('all', 'drivers'));

create or replace function public.trg_meet_announcement_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select user_id from meet_attendees
           where meet_id = new.meet_id and user_id <> new.author_id
             and (new.audience = 'all' or role in ('driver', 'organizer')) loop
    if not exists (select 1 from blocks where blocker_id = a.user_id and blocked_id = new.author_id) then
      insert into notifications (recipient_id, actor_id, type, meet_id, text) values (a.user_id, new.author_id, 'meetUpdate', new.meet_id, left(new.text, 60));
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.trg_meet_announcement_notify() from public, anon, authenticated;
