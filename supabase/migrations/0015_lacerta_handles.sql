-- The app is now called Lacerta: keep its names free for the team (the old Carfooly ones stay reserved too).
insert into public.reserved_handles (handle) values ('lacerta'), ('lacertaapp'), ('lacerta_app'), ('lacerta_official'), ('lacertaofficial') on conflict do nothing;
