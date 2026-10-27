-- Safety clean-up after the first checks.
-- 1) Handles are already forced to lowercase by their format rule, so plain text is enough (no extension needed).
alter table public.profiles alter column handle type text;
create or replace function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where handle = lower(btrim(p_handle)));
$$;
drop extension if exists citext;

-- 2) Internal helpers can't be called from the app directly; they only run inside the database.
do $$ declare f text;
begin
  foreach f in array array['handle_new_user()','trg_blocks()','trg_car_follows()','trg_car_public_check()','trg_car_spots()',
    'trg_comment_likes()','trg_comments()','trg_follows()','trg_follows_after()','trg_meet_created()','trg_meet_leave()',
    'trg_meet_rsvp()','trg_post_likes()','trg_posts_tags()','trg_thread_replies()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
-- Used by the meet rules for signed-in people only.
revoke execute on function public.is_meet_organizer(uuid, uuid) from public, anon;
grant execute on function public.is_meet_organizer(uuid, uuid) to authenticated;
