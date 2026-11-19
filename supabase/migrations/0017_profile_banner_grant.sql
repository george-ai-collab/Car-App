-- Let people save their own banner (profiles only allows updates to listed columns).
grant update (banner_url) on public.profiles to authenticated;
