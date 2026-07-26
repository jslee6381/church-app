create table public.member_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  session_token_hash text not null unique,
  user_agent text,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index member_sessions_member_id_idx on public.member_sessions (member_id);
create index member_sessions_church_id_idx on public.member_sessions (church_id);
create index member_sessions_expires_at_idx on public.member_sessions (expires_at);

create trigger set_member_sessions_updated_at
before update on public.member_sessions
for each row execute function public.set_updated_at();

alter table public.member_sessions enable row level security;

create policy "members can view their own sessions"
on public.member_sessions
for select
using (member_id = public.current_member_id());

create policy "leaders can view sessions in their church"
on public.member_sessions
for select
using (church_id = public.current_church_id() and public.is_admin_or_leader());

revoke all on public.member_sessions from anon, authenticated;
grant select on public.member_sessions to authenticated;
