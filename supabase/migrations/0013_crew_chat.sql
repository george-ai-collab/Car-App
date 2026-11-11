-- Crew chat: a WhatsApp-style group chat in each community (replaces Discuss),
-- with roles (owner / admin / member), join requests, and who-can-post settings.
-- Old discussions stay in the database; the app just stops showing the Discuss tab.

-- ============ community settings ============
alter table public.communities
  add column join_mode text not null default 'open' check (join_mode in ('open', 'approval')),
  add column chat_mode text not null default 'everyone' check (chat_mode in ('everyone', 'admins', 'auto')),
  add column chat_auto_limit int not null default 50 check (chat_auto_limit between 5 and 5000),
  add column pinned_message_id uuid;

-- ============ roles ============
alter table public.community_members
  add column role text not null default 'member' check (role in ('admin', 'member'));
-- (The owner is communities.created_by. Brand communities have no owner: app admins run them.)

create or replace function public.community_role(p_community uuid, p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when c.created_by = p_user then 'owner'
    when m.role = 'admin' then 'admin'
    when c.kind = 'brand' and exists (select 1 from profiles where id = p_user and is_admin) then 'admin'
    when m.user_id is not null then 'member'
    else null end
  from communities c
  left join community_members m on m.community_id = c.id and m.user_id = p_user
  where c.id = p_community;
$$;
grant execute on function public.community_role(uuid, uuid) to authenticated;

-- Can this person write in the chat right now?
create or replace function public.can_chat(p_community uuid, p_user uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c communities; r text; n int;
begin
  select * into c from communities where id = p_community;
  if not found then return false; end if;
  if exists (select 1 from profiles where id = p_user and banned) then return false; end if;
  r := community_role(p_community, p_user);
  if r is null then return false; end if;
  if r in ('owner', 'admin') then return true; end if;
  -- Members must actually be members (an app admin in a brand community counts as admin above).
  if not exists (select 1 from community_members where community_id = p_community and user_id = p_user) then return false; end if;
  if c.chat_mode = 'everyone' then return true; end if;
  if c.chat_mode = 'admins' then return false; end if;
  select count(*) into n from community_members where community_id = p_community;
  return n <= c.chat_auto_limit; -- 'auto': everyone until the group gets big, then admins only
end $$;
grant execute on function public.can_chat(uuid, uuid) to authenticated;

-- ============ joining ============
create table public.community_join_requests (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
alter table public.community_join_requests enable row level security;
create policy "ask" on public.community_join_requests for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from communities c where c.id = community_id and c.join_mode = 'approval')
    and not exists (select 1 from community_members m where m.community_id = community_join_requests.community_id and m.user_id = (select auth.uid())));
create policy "see" on public.community_join_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.community_role(community_id, (select auth.uid())) in ('owner', 'admin'));
create policy "take back" on public.community_join_requests for delete to authenticated
  using (user_id = (select auth.uid()));

-- Joining yourself only works for open communities (approval ones go through a request).
drop policy "as me" on public.community_members;
create policy "as me" on public.community_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member'
    and (exists (select 1 from communities c where c.id = community_id and (c.join_mode = 'open' or c.kind = 'brand' or c.created_by = (select auth.uid())))));

-- Owner/admins: accept or turn down a request.
create or replace function public.answer_join_request(p_community uuid, p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if community_role(p_community, auth.uid()) not in ('owner', 'admin') then raise exception 'admins only'; end if;
  if not exists (select 1 from community_join_requests where community_id = p_community and user_id = p_user) then return; end if;
  delete from community_join_requests where community_id = p_community and user_id = p_user;
  if p_accept then insert into community_members (community_id, user_id) values (p_community, p_user) on conflict do nothing; end if;
end $$;
revoke execute on function public.answer_join_request(uuid, uuid, boolean) from public, anon;
grant execute on function public.answer_join_request(uuid, uuid, boolean) to authenticated;

-- Owner: make someone an admin or a member again.
create or replace function public.set_member_role(p_community uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('admin', 'member') then raise exception 'bad role'; end if;
  if community_role(p_community, auth.uid()) <> 'owner' then raise exception 'owner only'; end if;
  update community_members set role = p_role where community_id = p_community and user_id = p_user;
end $$;
revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- Owner/admins: remove someone. Admins can't remove other admins or the owner.
create or replace function public.remove_member(p_community uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare mine text; theirs text;
begin
  mine := community_role(p_community, auth.uid());
  theirs := community_role(p_community, p_user);
  if mine not in ('owner', 'admin') then raise exception 'admins only'; end if;
  if theirs = 'owner' or (theirs = 'admin' and mine <> 'owner') then raise exception 'not allowed'; end if;
  delete from community_members where community_id = p_community and user_id = p_user;
end $$;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ============ messages ============
create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body text not null default '' check (char_length(body) <= 1000),
  photo_url text,
  reply_to uuid references public.community_messages(id) on delete set null,
  meet_id uuid references public.meets(id) on delete set null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(body) > 0 or photo_url is not null or meet_id is not null)
);
create index community_messages_recent on public.community_messages (community_id, created_at desc);
alter table public.community_messages enable row level security;
create policy "members read" on public.community_messages for select to authenticated
  using (public.community_role(community_id, (select auth.uid())) is not null and (not hidden or author_id = (select auth.uid())) or (select public.is_admin()));
create policy "write" on public.community_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_chat(community_id, (select auth.uid())));
create policy "delete" on public.community_messages for delete to authenticated
  using (author_id = (select auth.uid()) or public.community_role(community_id, (select auth.uid())) in ('owner', 'admin') or (select public.is_admin()));
create trigger community_messages_clean before insert on public.community_messages for each row execute function public.trg_clean_text('body');
create trigger community_messages_not_banned before insert on public.community_messages for each row execute function public.trg_not_banned();

alter table public.communities add constraint communities_pinned_fk foreign key (pinned_message_id) references public.community_messages(id) on delete set null;

-- Owner/admins: pin one message to the top of the chat (or unpin with null).
create or replace function public.pin_message(p_community uuid, p_message uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if community_role(p_community, auth.uid()) not in ('owner', 'admin') then raise exception 'admins only'; end if;
  if p_message is not null and not exists (select 1 from community_messages where id = p_message and community_id = p_community) then raise exception 'not in this chat'; end if;
  update communities set pinned_message_id = p_message where id = p_community;
end $$;
revoke execute on function public.pin_message(uuid, uuid) from public, anon;
grant execute on function public.pin_message(uuid, uuid) to authenticated;

-- New messages arrive straight away (Supabase Realtime; it still checks who may read them).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end $$;

-- ============ reports on messages ============
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check
  check (kind in ('post', 'comment', 'reply', 'user', 'meet', 'community', 'thread', 'threadReply', 'car', 'message'));

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
    elsif new.kind = 'message' then update community_messages set hidden = true where id = v_id;
    end if;
  end if;
  return new;
end $$;

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
      when 'message' then (select author_id from community_messages where id = v_id)
    end;
  end if;
  if p_action = 'keep' then
    if p_kind = 'post' then update posts set hidden = false where id = v_id;
    elsif p_kind in ('comment', 'reply') then update comments set hidden = false where id = v_id;
    elsif p_kind = 'thread' then update threads set hidden = false where id = v_id;
    elsif p_kind = 'threadReply' then update thread_replies set hidden = false where id = v_id;
    elsif p_kind = 'message' then update community_messages set hidden = false where id = v_id;
    end if;
  elsif p_kind <> 'user' then
    if p_kind = 'post' then delete from posts where id = v_id;
    elsif p_kind in ('comment', 'reply') then delete from comments where id = v_id;
    elsif p_kind = 'thread' then delete from threads where id = v_id;
    elsif p_kind = 'threadReply' then delete from thread_replies where id = v_id;
    elsif p_kind = 'meet' then delete from meets where id = v_id;
    elsif p_kind = 'community' then delete from communities where id = v_id;
    elsif p_kind = 'car' then delete from cars where id = v_id;
    elsif p_kind = 'message' then delete from community_messages where id = v_id;
    end if;
  end if;
  if (p_action = 'ban' or (p_action = 'remove' and p_kind = 'user')) and v_author is not null then
    update profiles set banned = true where id = v_author and not is_admin;
  end if;
  update reports set status = case p_action when 'keep' then 'dismissed' when 'ban' then 'banned' else 'removed' end
    where kind = p_kind and target_id = p_target and status = 'open';
end $$;

-- ============ notifications: join requests ============
alter table public.notifications add column community_id uuid references public.communities(id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'reply', 'follow', 'spot', 'followBuild', 'commentLike', 'tag', 'threadReply', 'meetUpdate', 'joinRequest', 'joinAccepted'));

-- Someone asks to join: tell the owner and admins.
create or replace function public.trg_join_request_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (recipient_id, actor_id, type, community_id)
  select x.uid, new.user_id, 'joinRequest', new.community_id from (
    select created_by as uid from communities where id = new.community_id and created_by is not null
    union select user_id from community_members where community_id = new.community_id and role = 'admin'
  ) x where x.uid <> new.user_id;
  return new;
end $$;
revoke execute on function public.trg_join_request_notify() from public, anon, authenticated;
create trigger join_requests_notify after insert on public.community_join_requests for each row execute function public.trg_join_request_notify();

create or replace function public.answer_join_request(p_community uuid, p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if community_role(p_community, auth.uid()) not in ('owner', 'admin') then raise exception 'admins only'; end if;
  if not exists (select 1 from community_join_requests where community_id = p_community and user_id = p_user) then return; end if;
  delete from community_join_requests where community_id = p_community and user_id = p_user;
  delete from notifications where type = 'joinRequest' and community_id = p_community and actor_id = p_user;
  if p_accept then
    insert into community_members (community_id, user_id) values (p_community, p_user) on conflict do nothing;
    insert into notifications (recipient_id, actor_id, type, community_id) values (p_user, auth.uid(), 'joinAccepted', p_community);
  end if;
end $$;

-- Meet views can come from a meet shared in a crew chat.
alter table public.meet_views drop constraint meet_views_source_check;
alter table public.meet_views add constraint meet_views_source_check check (source in ('feed', 'meets', 'discover', 'profile', 'tag', 'link', 'notification', 'search', 'chat', 'other'));
