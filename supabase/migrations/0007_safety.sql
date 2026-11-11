-- Safety: banned words, reserved handles, admins, bans, auto-hide after reports, admin review tools.

-- ---------- word list + reserved handles (edit these tables any time in the dashboard) ----------
create table public.banned_words (word text primary key, mode text not null default 'word' check (mode in ('any', 'word')));
create table public.reserved_handles (handle text primary key);
alter table public.banned_words enable row level security;
alter table public.reserved_handles enable row level security;
insert into public.banned_words (word, mode) values
  ('nigger', 'any'),
  ('nigga', 'any'),
  ('faggot', 'any'),
  ('fagot', 'any'),
  ('retard', 'any'),
  ('kike', 'word'),
  ('chink', 'word'),
  ('spic', 'word'),
  ('wetback', 'any'),
  ('tranny', 'any'),
  ('coon', 'word'),
  ('paki', 'word'),
  ('gook', 'word'),
  ('raghead', 'any'),
  ('towelhead', 'any'),
  ('sandnigger', 'any'),
  ('dyke', 'word'),
  ('fag', 'word'),
  ('beaner', 'any'),
  ('zipperhead', 'any'),
  ('fuck', 'any'),
  ('fucker', 'any'),
  ('motherfucker', 'any'),
  ('shit', 'word'),
  ('bitch', 'any'),
  ('cunt', 'word'),
  ('cunts', 'word'),
  ('whore', 'any'),
  ('slut', 'any'),
  ('asshole', 'any'),
  ('dick', 'word'),
  ('pussy', 'word'),
  ('cock', 'word'),
  ('bastard', 'word'),
  ('wanker', 'any'),
  ('twat', 'word'),
  ('kys', 'word'),
  ('killyourself', 'any'),
  ('rape', 'word'),
  ('rapist', 'any'),
  ('nazi', 'word'),
  ('hitler', 'any'),
  ('كس', 'word'),
  ('كسك', 'word'),
  ('كسمك', 'any'),
  ('زب', 'word'),
  ('زبي', 'word'),
  ('شرموط', 'any'),
  ('شرموطة', 'any'),
  ('شرموطه', 'any'),
  ('منيوك', 'any'),
  ('منيوكة', 'any'),
  ('قحبة', 'any'),
  ('قحبه', 'any'),
  ('عرص', 'word'),
  ('معرص', 'any'),
  ('خول', 'word'),
  ('لوطي', 'any'),
  ('زامل', 'word'),
  ('ابن الكلب', 'any'),
  ('يلعن', 'word'),
  ('طيز', 'word'),
  ('نيك', 'word'),
  ('انيك', 'any')
on conflict do nothing;
insert into public.reserved_handles (handle) values
  ('carfooly'),
  ('admin'),
  ('administrator'),
  ('support'),
  ('help'),
  ('official'),
  ('moderator'),
  ('mod'),
  ('mods'),
  ('staff'),
  ('team'),
  ('security'),
  ('system'),
  ('root'),
  ('owner'),
  ('founder'),
  ('verified'),
  ('news'),
  ('info'),
  ('contact'),
  ('app'),
  ('carfoolyapp'),
  ('carfooly_official'),
  ('bmw'),
  ('mercedes'),
  ('mercedesbenz'),
  ('benz'),
  ('amg'),
  ('audi'),
  ('porsche'),
  ('volkswagen'),
  ('vw'),
  ('toyota'),
  ('lexus'),
  ('nissan'),
  ('infiniti'),
  ('honda'),
  ('acura'),
  ('mazda'),
  ('subaru'),
  ('mitsubishi'),
  ('suzuki'),
  ('hyundai'),
  ('kia'),
  ('genesis'),
  ('ford'),
  ('chevrolet'),
  ('chevy'),
  ('gmc'),
  ('cadillac'),
  ('dodge'),
  ('jeep'),
  ('ram'),
  ('chrysler'),
  ('tesla'),
  ('lucid'),
  ('rivian'),
  ('ferrari'),
  ('lamborghini'),
  ('maserati'),
  ('alfaromeo'),
  ('fiat'),
  ('bugatti'),
  ('mclaren'),
  ('astonmartin'),
  ('bentley'),
  ('rollsroyce'),
  ('jaguar'),
  ('landrover'),
  ('rangerover'),
  ('mini'),
  ('volvo'),
  ('polestar'),
  ('peugeot'),
  ('renault'),
  ('citroen'),
  ('skoda'),
  ('seat'),
  ('cupra'),
  ('opel'),
  ('lotus'),
  ('koenigsegg'),
  ('pagani'),
  ('rimac'),
  ('byd'),
  ('geely'),
  ('chery'),
  ('haval'),
  ('gwm'),
  ('mg'),
  ('jetour'),
  ('nio'),
  ('xpeng'),
  ('lancia'),
  ('dacia'),
  ('isuzu'),
  ('lincoln'),
  ('buick'),
  ('pontiac')
on conflict do nothing;

-- Disguised spellings: 4→a 3→e 1→i 0→o 5/$→s 7→t 8→b @→a, Arabic diacritics dropped, long repeats squeezed.
create or replace function public.norm_text(p text) returns text language sql immutable set search_path = public as $$
  select regexp_replace(regexp_replace(translate(lower(coalesce(p, '')), '4@31!05$78', 'aaeiioosstb'), '[ً-ْـ]', '', 'g'), '(.)\1{2,}', '\1\1', 'g');
$$;

-- First banned word found in a text, or null. Whole words only, except "any" words (slurs).
create or replace function public.find_banned(p text) returns text language plpgsql stable security definer set search_path = public as $$
declare n text; words text[]; joined text; spaced text; r record; nw text;
begin
  if p is null or btrim(p) = '' then return null; end if;
  n := norm_text(p);
  words := regexp_split_to_array(n, '[^a-z؀-ۿ]+');
  spaced := ' ' || array_to_string(words, ' ') || ' ';
  joined := regexp_replace(n, '[^a-z؀-ۿ]', '', 'g');
  for r in select word, mode from banned_words loop
    nw := norm_text(r.word);
    if position(' ' in nw) > 0 then
      if position(' ' || nw || ' ' in spaced) > 0 then return r.word; end if;
      continue;
    end if;
    if nw = any(words) then return r.word; end if;
    if r.mode = 'any' and position(regexp_replace(nw, '[^a-z؀-ۿ]', '', 'g') in joined) > 0 then return r.word; end if;
  end loop;
  return null;
end $$;

-- Handle check: 'invalid' | 'reserved' | 'not_allowed' | 'taken' | 'ok'
create or replace function public.handle_status(p_handle text) returns text language plpgsql stable security definer set search_path = public as $$
declare h text := lower(btrim(coalesce(p_handle, ''))); core text; j text;
begin
  if h !~ '^[a-z0-9_.]{2,24}$' then return 'invalid'; end if;
  core := replace(replace(h, '_', ''), '.', '');
  if exists (select 1 from reserved_handles r where core in (r.handle, r.handle || 'official', 'official' || r.handle, 'the' || r.handle, r.handle || 'app')) then return 'reserved'; end if;
  j := regexp_replace(norm_text(h), '[^a-z]', '', 'g');
  if exists (select 1 from banned_words b where b.mode = 'any' and b.word ~ '[a-z]' and position(regexp_replace(norm_text(b.word), '[^a-z]', '', 'g') in j) > 0) then return 'not_allowed'; end if;
  if find_banned(translate(h, '_.', '  ')) is not null then return 'not_allowed'; end if;
  if exists (select 1 from profiles where handle = h) then return 'taken'; end if;
  return 'ok';
end $$;
grant execute on function public.handle_status(text) to anon, authenticated;
create or replace function public.handle_available(p_handle text) returns boolean language sql stable security definer set search_path = public as $$
  select public.handle_status(p_handle) = 'ok';
$$;

-- Sign-up refuses reserved / not-allowed handles too.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare h text := lower(new.raw_user_meta_data->>'handle'); st text;
begin
  st := handle_status(h);
  if st in ('reserved', 'not_allowed', 'invalid') then raise exception 'handle %', st; end if;
  insert into profiles (id, handle, name) values (new.id, h, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- text checks on everything people write ----------
create or replace function public.trg_clean_text() returns trigger language plpgsql security definer set search_path = public as $$
declare col text; v text;
begin
  foreach col in array tg_argv loop
    v := to_jsonb(new) ->> col;
    if tg_op = 'UPDATE' and v is not distinct from (to_jsonb(old) ->> col) then continue; end if; -- only check what changed
    if find_banned(v) is not null then raise exception 'not allowed words'; end if;
  end loop;
  return new;
end $$;
revoke execute on function public.trg_clean_text() from public, anon, authenticated;
create trigger posts_clean before insert or update on public.posts for each row execute function public.trg_clean_text('caption', 'car_label');
create trigger comments_clean before insert or update on public.comments for each row execute function public.trg_clean_text('text');
create trigger profiles_clean before insert or update on public.profiles for each row execute function public.trg_clean_text('name', 'bio');
create trigger threads_clean before insert or update on public.threads for each row execute function public.trg_clean_text('title', 'body');
create trigger thread_replies_clean before insert or update on public.thread_replies for each row execute function public.trg_clean_text('text');
create trigger communities_clean before insert or update on public.communities for each row execute function public.trg_clean_text('name', 'description');
create trigger meets_clean before insert or update on public.meets for each row execute function public.trg_clean_text('title', 'note', 'location');
create trigger cars_clean before insert or update on public.cars for each row execute function public.trg_clean_text('nickname');

-- ---------- admins and bans ----------
alter table public.profiles add column is_admin boolean not null default false;
alter table public.profiles add column banned boolean not null default false;
-- (only the dashboard can set these: app users can't update these columns)
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

create or replace function public.trg_not_banned() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = auth.uid() and banned) then raise exception 'banned'; end if;
  return new;
end $$;
revoke execute on function public.trg_not_banned() from public, anon, authenticated;
do $$ declare t text;
begin
  foreach t in array array['posts','comments','threads','thread_replies','meets','communities','cars','follows','post_likes','comment_likes','car_spots','sightings'] loop
    execute format('create trigger %I before insert on public.%I for each row execute function public.trg_not_banned()', t || '_not_banned', t);
  end loop;
end $$;

-- ---------- hidden after reports ----------
alter table public.posts add column hidden boolean not null default false;
alter table public.comments add column hidden boolean not null default false;
alter table public.threads add column hidden boolean not null default false;
alter table public.thread_replies add column hidden boolean not null default false;

drop policy "read" on public.posts;
create policy "read" on public.posts for select to authenticated
  using ((not archived and not hidden) or author_id = (select auth.uid()) or (select public.is_admin()));
drop policy "read" on public.comments;
create policy "read" on public.comments for select to authenticated using (not hidden or author_id = (select auth.uid()) or (select public.is_admin()));
drop policy "read" on public.threads;
create policy "read" on public.threads for select to authenticated using (not hidden or author_id = (select auth.uid()) or (select public.is_admin()));
drop policy "read" on public.thread_replies;
create policy "read" on public.thread_replies for select to authenticated using (not hidden or author_id = (select auth.uid()) or (select public.is_admin()));

-- 3 reports from different people: hide it until an admin looks.
create or replace function public.trg_report_autohide() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; v_id uuid;
begin
  select count(distinct reporter_id) into n from reports where kind = new.kind and target_id = new.target_id and status = 'open';
  if n >= 3 and new.target_id ~ '^[0-9a-f-]{36}$' then
    v_id := new.target_id::uuid;
    if new.kind = 'post' then update posts set hidden = true where id = v_id;
    elsif new.kind in ('comment', 'reply') then update comments set hidden = true where id = v_id;
    elsif new.kind = 'thread' then update threads set hidden = true where id = v_id;
    elsif new.kind = 'threadReply' then update thread_replies set hidden = true where id = v_id;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.trg_report_autohide() from public, anon, authenticated;
create trigger reports_autohide after insert on public.reports for each row execute function public.trg_report_autohide();
-- one report per person per thing
create unique index reports_once on public.reports (reporter_id, kind, target_id) where status = 'open';

-- Admins can read reports.
create policy "admins read" on public.reports for select to authenticated using ((select public.is_admin()));

-- Admin decision on everything reported about one thing: 'remove' | 'keep' | 'ban' (ban the author and remove).
create or replace function public.admin_resolve(p_kind text, p_target text, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_id uuid;
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if p_action not in ('remove', 'keep', 'ban') then raise exception 'bad action'; end if;
  if p_kind = 'user' then
    select id into v_author from profiles where handle = lower(p_target);
  else
    v_id := p_target::uuid;
    v_author := case p_kind
      when 'post' then (select author_id from posts where id = v_id)
      when 'comment' then (select author_id from comments where id = v_id)
      when 'reply' then (select author_id from comments where id = v_id)
      when 'thread' then (select author_id from threads where id = v_id)
      when 'threadReply' then (select author_id from thread_replies where id = v_id)
      when 'meet' then (select organizer_id from meets where id = v_id)
      when 'community' then (select created_by from communities where id = v_id)
      when 'car' then (select owner_id from cars where id = v_id)
    end;
  end if;

  if p_action = 'keep' then
    if p_kind = 'post' then update posts set hidden = false where id = v_id;
    elsif p_kind in ('comment', 'reply') then update comments set hidden = false where id = v_id;
    elsif p_kind = 'thread' then update threads set hidden = false where id = v_id;
    elsif p_kind = 'threadReply' then update thread_replies set hidden = false where id = v_id;
    end if;
  elsif p_kind <> 'user' then
    if p_kind = 'post' then delete from posts where id = v_id;
    elsif p_kind in ('comment', 'reply') then delete from comments where id = v_id;
    elsif p_kind = 'thread' then delete from threads where id = v_id;
    elsif p_kind = 'threadReply' then delete from thread_replies where id = v_id;
    elsif p_kind = 'meet' then delete from meets where id = v_id;
    elsif p_kind = 'community' then delete from communities where id = v_id;
    elsif p_kind = 'car' then delete from cars where id = v_id;
    end if;
  end if;
  if (p_action = 'ban' or (p_action = 'remove' and p_kind = 'user')) and v_author is not null then
    update profiles set banned = true where id = v_author and not is_admin;
  end if;
  update reports set status = case p_action when 'keep' then 'dismissed' when 'ban' then 'banned' else 'removed' end
    where kind = p_kind and target_id = p_target and status = 'open';
end $$;
revoke execute on function public.admin_resolve(text, text, text) from public, anon;
grant execute on function public.admin_resolve(text, text, text) to authenticated;

-- Internal helpers stay internal.
revoke execute on function public.find_banned(text) from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
