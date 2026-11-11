-- What kind of account: most people are "personal"; clubs and businesses get a small label.
alter table public.profiles add column account_type text not null default 'personal'
  check (account_type in ('personal', 'club', 'business'));
grant update (name, bio, avatar_url, account_type) on public.profiles to authenticated;
