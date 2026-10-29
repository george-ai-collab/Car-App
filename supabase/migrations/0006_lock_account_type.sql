-- The account type is chosen once, in the welcome steps right after sign-up.
-- After that (or after the first day) it can't change: a club or shop makes its own account.
alter table public.profiles add column type_set boolean not null default false;
update public.profiles set type_set = true where account_type <> 'personal' or created_at < now() - interval '1 day';

create or replace function public.trg_lock_account_type() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.account_type is distinct from old.account_type then
    if old.type_set or old.created_at < now() - interval '1 day' then
      raise exception 'account type can''t be changed';
    end if;
    new.type_set := true;
  end if;
  return new;
end $$;
revoke execute on function public.trg_lock_account_type() from public, anon, authenticated;
create trigger profiles_lock_account_type before update on public.profiles for each row execute function public.trg_lock_account_type();
