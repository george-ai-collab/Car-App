-- A wide banner photo at the top of each profile (cropped to 3:1 in the app).
alter table public.profiles add column if not exists banner_url text check (banner_url is null or char_length(banner_url) <= 1000);
