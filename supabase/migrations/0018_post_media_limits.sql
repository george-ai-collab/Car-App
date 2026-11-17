-- Limits for what one post can hold, checked by the database too (not just the app):
--   up to 10 photos/clips; a post with several items: each clip up to 15 s;
--   all video in a post together up to 60 s (the same as a single video post).
create or replace function public.post_media_ok(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when p is null or jsonb_typeof(p) <> 'array' then true else
    jsonb_array_length(p) <= 10
    and coalesce((select sum(coalesce((e->>'duration')::numeric, 0)) from jsonb_array_elements(p) e where e->>'type' = 'video'), 0) <= 61
    and (jsonb_array_length(p) = 1 or not exists (
      select 1 from jsonb_array_elements(p) e where e->>'type' = 'video' and coalesce((e->>'duration')::numeric, 0) > 15.5))
  end
$$;
alter table public.posts drop constraint if exists posts_media_limits;
alter table public.posts add constraint posts_media_limits check (public.post_media_ok(photos)) not valid;
