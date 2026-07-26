create table if not exists public.profiles (
  member_id uuid primary key references public.members(id) on delete cascade,
  profile_photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_same_church" on public.profiles;
create policy "profiles_select_own_or_same_church"
on public.profiles
for select
using (
  exists (
    select 1
    from public.members m
    where m.id = profiles.member_id
      and m.church_id = public.current_church_id()
  )
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for all
using (
  member_id = public.current_member_id()
  or public.is_admin_or_leader()
)
with check (
  member_id = public.current_member_id()
  or public.is_admin_or_leader()
);
