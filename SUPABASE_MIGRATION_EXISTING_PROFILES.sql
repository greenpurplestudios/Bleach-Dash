-- Run this if you already created public.profiles using the first setup SQL.
-- It upgrades that table to the schema used by the current Bleach Dash build.

alter table public.profiles
  add column if not exists souls bigint not null default 0 check (souls >= 0),
  add column if not exists best_score integer not null default 0 check (best_score >= 0),
  add column if not exists updated_at timestamptz not null default now();

-- Preserve any existing scores from the earlier high_score column.
update public.profiles
set best_score = greatest(coalesce(best_score, 0), coalesce(high_score, 0));

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,16}$');

create index if not exists profiles_best_score_idx
on public.profiles (best_score desc);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_bleach_dash_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_username text;
  candidate text;
begin
  requested_username := coalesce(new.raw_user_meta_data->>'username', 'Player');
  requested_username := regexp_replace(requested_username, '[^A-Za-z0-9_]', '', 'g');
  if length(requested_username) < 3 then
    requested_username := 'Player' || substr(replace(new.id::text,'-',''),1,5);
  end if;
  if length(requested_username) > 16 then
    requested_username := substr(requested_username,1,16);
  end if;

  candidate := requested_username;
  begin
    insert into public.profiles(id, username, souls, best_score)
    values(new.id, candidate, 0, 0);
  exception when unique_violation then
    candidate := 'Player' || substr(replace(new.id::text,'-',''),1,6);
    insert into public.profiles(id, username, souls, best_score)
    values(new.id, candidate, 0, 0);
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bleach_dash on auth.users;
create trigger on_auth_user_created_bleach_dash
after insert on auth.users
for each row execute procedure public.handle_new_bleach_dash_user();

create or replace function public.touch_bleach_dash_profile()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bleach_dash_profile_updated_at on public.profiles;
create trigger bleach_dash_profile_updated_at
before update on public.profiles
for each row execute procedure public.touch_bleach_dash_profile();
