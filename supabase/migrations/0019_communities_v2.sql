-- Communities, round 2.
-- 1) A photo and a banner for each community.
alter table public.communities
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 1000),
  add column if not exists banner_url text check (banner_url is null or char_length(banner_url) <= 1000);

-- 2) Only the fields the app edits can be changed. Before this, an owner could (by calling the
--    server directly) turn their group into an "official" brand one, and a post's author could
--    un-hide a post moderators had hidden or move it into a group they aren't in.
revoke update on public.communities from authenticated;
grant update (name, description, join_mode, chat_mode, chat_auto_limit, avatar_url, banner_url) on public.communities to authenticated;
revoke update on public.posts from authenticated;
grant update (caption, car_id, car_label, archived, edited_at) on public.posts to authenticated;
revoke update on public.threads from authenticated;
grant update (title, body, edited_at) on public.threads to authenticated;

-- 3) You can only post into a community you're in.
create or replace function public.trg_post_community() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.community_id is not null and (tg_op = 'INSERT' or new.community_id is distinct from old.community_id) then
    if not exists (select 1 from community_members m where m.community_id = new.community_id and m.user_id = new.author_id)
       and not exists (select 1 from communities c where c.id = new.community_id and c.created_by = new.author_id) then
      raise exception 'join the community first';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.trg_post_community() from public, anon, authenticated;
drop trigger if exists posts_community_members on public.posts;
create trigger posts_community_members before insert or update of community_id on public.posts
  for each row execute function public.trg_post_community();

-- 4) The owner can't leave their own community (they can delete it instead).
drop policy if exists "undo" on public.community_members;
create policy "undo" on public.community_members for delete to authenticated using (
  user_id = (select auth.uid())
  and not exists (select 1 from public.communities c where c.id = community_id and c.created_by = (select auth.uid())));

-- 5) Brand communities only for real makes from the car list (no more "Nsis" from a typo).
create or replace function public.join_brand_community(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then return null; end if;
  select name into v_name from car_makes where lower(name) = lower(btrim(coalesce(p_name, '')));
  if v_name is null then return null; end if;
  select id into v_id from communities where lower(btrim(name)) = lower(v_name);
  if v_id is null then
    insert into communities (name, description, kind, created_by)
    values (v_name, 'Everything ' || v_name || '.', 'brand', null)
    on conflict do nothing returning id into v_id;
    if v_id is null then select id into v_id from communities where lower(btrim(name)) = lower(v_name); end if;
  end if;
  insert into community_members (community_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end $$;
revoke execute on function public.join_brand_community(text) from public, anon;
grant execute on function public.join_brand_community(text) to authenticated;
