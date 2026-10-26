-- Co-organizers can set the Driving/Attending limits (only the creator can edit the rest of the meet).
create or replace function public.set_meet_caps(p_meet uuid, p_driver int, p_attendee int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_meet_organizer(p_meet, auth.uid()) then raise exception 'organizers only'; end if;
  update meets set driver_cap = p_driver, attendee_cap = p_attendee where id = p_meet;
end $$;
revoke execute on function public.set_meet_caps(uuid, int, int) from public, anon;
grant execute on function public.set_meet_caps(uuid, int, int) to authenticated;

-- Adding a car joins its brand community, creating it once if it doesn't exist yet. Returns its id.
create or replace function public.join_brand_community(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text := left(btrim(p_name), 40);
begin
  if auth.uid() is null or v_name = '' then return null; end if;
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

-- Brand communities are only made through join_brand_community now.
drop policy "add" on public.communities;
create policy "add" on public.communities for insert to authenticated with check (created_by = (select auth.uid()) and kind = 'custom');
