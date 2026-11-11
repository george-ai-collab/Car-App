-- Video posts: a separate storage area for clips (up to 30 MB each; the app shrinks them first).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 31457280, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
create policy "upload own videos" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "list own videos" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own videos" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- one video per post
create or replace function public.video_count(p jsonb) returns int language sql immutable set search_path = public as $$
  select count(*)::int from jsonb_array_elements(coalesce(p, '[]'::jsonb)) e where e->>'type' = 'video';
$$;
alter table public.posts add constraint posts_one_video check (public.video_count(photos) <= 1);
