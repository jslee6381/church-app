-- Grace Community initial schema
-- Assumptions:
-- 1. Supabase Auth is still used for sessions, but members do not self-register with email/password.
-- 2. Members are provisioned or claimed through invitation codes / QR invitations.
-- 3. auth.users rows may be linked to members.auth_user_id after invitation claim.

create extension if not exists pgcrypto;

create type public.member_status as enum ('invited', 'active', 'inactive');
create type public.role_name as enum ('admin', 'leader', 'member');
create type public.content_visibility as enum ('public', 'members', 'leaders_only');
create type public.invitation_token_status as enum ('active', 'inactive', 'expired');
create type public.event_rsvp_status as enum ('going', 'maybe', 'not_going');
create type public.prayer_request_status as enum ('pending', 'approved', 'rejected', 'archived');
create type public.prayer_request_visibility as enum ('public', 'small_group', 'leaders_only');
create type public.notification_status as enum ('draft', 'scheduled', 'sent', 'cancelled');
create type public.audit_action as enum (
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'archive',
  'send',
  'claim_invitation'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/New_York',
  address text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint churches_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  auth_user_id uuid unique,
  invitation_token_id uuid,
  full_name text not null,
  phone text,
  birth_year integer,
  generation_label text,
  language_preference text not null default 'en',
  access_code_hash text,
  status public.member_status not null default 'invited',
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint members_birth_year_check check (
    birth_year is null or birth_year between 1900 and extract(year from now())::integer
  )
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name public.role_name not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (church_id, name)
);

create table public.member_roles (
  member_id uuid not null references public.members(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (member_id, role_id)
);

create or replace function public.current_member_id()
returns uuid
language sql
stable
as $$
  select m.id
  from public.members m
  where m.auth_user_id = auth.uid()
    and m.status = 'active'
  limit 1
$$;

create or replace function public.current_church_id()
returns uuid
language sql
stable
as $$
  select m.church_id
  from public.members m
  where m.auth_user_id = auth.uid()
    and m.status = 'active'
  limit 1
$$;

create or replace function public.has_role(check_role public.role_name)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.members m
    join public.member_roles mr on mr.member_id = m.id
    join public.roles r on r.id = mr.role_id
    where m.auth_user_id = auth.uid()
      and m.status = 'active'
      and r.name = check_role
  )
$$;

create or replace function public.is_admin_or_leader()
returns boolean
language sql
stable
as $$
  select public.has_role('admin') or public.has_role('leader')
$$;

create table public.invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  hashed_token text not null unique,
  token_hint text,
  qr_payload text,
  issued_for_name text,
  issued_by_member_id uuid references public.members(id) on delete set null,
  claimed_by_member_id uuid references public.members(id) on delete set null,
  expires_at timestamptz not null,
  max_usage integer not null default 1,
  usage_count integer not null default 0,
  status public.invitation_token_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invitation_tokens_max_usage_check check (max_usage > 0),
  constraint invitation_tokens_usage_count_check check (usage_count >= 0 and usage_count <= max_usage)
);

alter table public.members
  add constraint members_invitation_token_fk
  foreign key (invitation_token_id) references public.invitation_tokens(id) on delete set null;

create table public.ministries (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (church_id, name)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  ministry_id uuid references public.ministries(id) on delete set null,
  title text not null,
  summary text,
  body text not null,
  visibility public.content_visibility not null default 'members',
  is_pinned boolean not null default false,
  pinned_until timestamptz,
  published_at timestamptz,
  author_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  ministry_id uuid references public.ministries(id) on delete set null,
  title text not null,
  summary text,
  description text,
  visibility public.content_visibility not null default 'members',
  location_name text,
  location_address text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer,
  requires_rsvp boolean not null default false,
  transportation_notes text,
  accessibility_notes text,
  published_at timestamptz,
  published_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_capacity_check check (capacity is null or capacity > 0),
  constraint events_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status public.event_rsvp_status not null,
  attendee_count integer not null default 1,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, member_id),
  constraint event_rsvps_attendee_count_check check (attendee_count > 0)
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  requester_member_id uuid references public.members(id) on delete set null,
  title text,
  subject_name text,
  request_text text not null,
  status public.prayer_request_status not null default 'pending',
  visibility public.prayer_request_visibility not null default 'public',
  approved_by_member_id uuid references public.members(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prayer_requests_approval_state_check check (
    (status = 'approved' and approved_at is not null)
    or (status <> 'approved')
  )
);

create table public.community_updates (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  ministry_id uuid references public.ministries(id) on delete set null,
  title text,
  summary text,
  body text,
  image_url text,
  activity_date date,
  visibility public.content_visibility not null default 'members',
  published_at timestamptz,
  author_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null,
  body text not null,
  deep_link text,
  audience_filter jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notifications_sent_after_scheduled check (
    sent_at is null or scheduled_at is null or sent_at >= scheduled_at
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  actor_member_id uuid references public.members(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action public.audit_action not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index members_church_id_idx on public.members (church_id);
create index members_auth_user_id_idx on public.members (auth_user_id);
create index roles_church_id_idx on public.roles (church_id);
create index invitation_tokens_church_id_idx on public.invitation_tokens (church_id);
create index invitation_tokens_expires_at_idx on public.invitation_tokens (expires_at);
create index announcements_church_id_published_at_idx on public.announcements (church_id, published_at desc);
create index events_church_id_starts_at_idx on public.events (church_id, starts_at);
create index event_rsvps_event_id_idx on public.event_rsvps (event_id);
create index prayer_requests_church_id_status_idx on public.prayer_requests (church_id, status, created_at desc);
create index community_updates_church_id_published_at_idx on public.community_updates (church_id, published_at desc);
create index notifications_church_id_status_idx on public.notifications (church_id, status);
create index audit_logs_church_id_created_at_idx on public.audit_logs (church_id, created_at desc);

create trigger set_churches_updated_at
before update on public.churches
for each row execute function public.set_updated_at();

create trigger set_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create trigger set_invitation_tokens_updated_at
before update on public.invitation_tokens
for each row execute function public.set_updated_at();

create trigger set_ministries_updated_at
before update on public.ministries
for each row execute function public.set_updated_at();

create trigger set_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger set_event_rsvps_updated_at
before update on public.event_rsvps
for each row execute function public.set_updated_at();

create trigger set_prayer_requests_updated_at
before update on public.prayer_requests
for each row execute function public.set_updated_at();

create trigger set_community_updates_updated_at
before update on public.community_updates
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

alter table public.churches enable row level security;
alter table public.members enable row level security;
alter table public.roles enable row level security;
alter table public.member_roles enable row level security;
alter table public.invitation_tokens enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.community_updates enable row level security;
alter table public.ministries enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "members can view their church"
on public.churches
for select
using (id = public.current_church_id());

create policy "admins can update their church"
on public.churches
for update
using (id = public.current_church_id() and public.has_role('admin'))
with check (id = public.current_church_id() and public.has_role('admin'));

create policy "members can view members in their church"
on public.members
for select
using (church_id = public.current_church_id());

create policy "admins and leaders can insert members"
on public.members
for insert
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members can update themselves"
on public.members
for update
using (id = public.current_member_id())
with check (id = public.current_member_id() and church_id = public.current_church_id());

create policy "admins and leaders can update members in their church"
on public.members
for update
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members can view roles in their church"
on public.roles
for select
using (church_id = public.current_church_id());

create policy "admins manage roles"
on public.roles
for all
using (church_id = public.current_church_id() and public.has_role('admin'))
with check (church_id = public.current_church_id() and public.has_role('admin'));

create policy "members can view member roles in their church"
on public.member_roles
for select
using (
  exists (
    select 1
    from public.members m
    where m.id = member_roles.member_id
      and m.church_id = public.current_church_id()
  )
);

create policy "admins manage member roles"
on public.member_roles
for all
using (
  public.has_role('admin')
  and exists (
    select 1
    from public.members m
    where m.id = member_roles.member_id
      and m.church_id = public.current_church_id()
  )
)
with check (
  public.has_role('admin')
  and exists (
    select 1
    from public.members m
    where m.id = member_roles.member_id
      and m.church_id = public.current_church_id()
  )
);

create policy "leaders can view invitation tokens"
on public.invitation_tokens
for select
using (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "leaders manage invitation tokens"
on public.invitation_tokens
for all
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members view visible announcements"
on public.announcements
for select
using (
  church_id = public.current_church_id()
  and (
    visibility in ('public', 'members')
    or (visibility = 'leaders_only' and public.is_admin_or_leader())
  )
);

create policy "leaders manage announcements"
on public.announcements
for all
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members view visible events"
on public.events
for select
using (
  church_id = public.current_church_id()
  and (
    visibility in ('public', 'members')
    or (visibility = 'leaders_only' and public.is_admin_or_leader())
  )
);

create policy "leaders manage events"
on public.events
for all
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members view their own event rsvps"
on public.event_rsvps
for select
using (
  member_id = public.current_member_id()
  or exists (
    select 1
    from public.events e
    where e.id = event_rsvps.event_id
      and e.church_id = public.current_church_id()
      and public.is_admin_or_leader()
  )
);

create policy "members create their own event rsvps"
on public.event_rsvps
for insert
with check (
  member_id = public.current_member_id()
  and exists (
    select 1
    from public.events e
    where e.id = event_rsvps.event_id
      and e.church_id = public.current_church_id()
  )
);

create policy "members update their own event rsvps"
on public.event_rsvps
for update
using (
  member_id = public.current_member_id()
  or exists (
    select 1
    from public.events e
    where e.id = event_rsvps.event_id
      and e.church_id = public.current_church_id()
      and public.is_admin_or_leader()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_rsvps.event_id
      and e.church_id = public.current_church_id()
  )
);

create policy "members submit prayer requests"
on public.prayer_requests
for insert
with check (
  church_id = public.current_church_id()
  and requester_member_id = public.current_member_id()
  and status = 'pending'
  and approved_by_member_id is null
  and approved_at is null
);

create policy "members view allowed prayer requests"
on public.prayer_requests
for select
using (
  church_id = public.current_church_id()
  and (
    requester_member_id = public.current_member_id()
    or (
      status = 'approved'
      and (
        visibility = 'public'
        or (visibility = 'small_group' and public.is_admin_or_leader())
        or (visibility = 'leaders_only' and public.is_admin_or_leader())
      )
    )
    or (status in ('pending', 'rejected', 'archived') and public.is_admin_or_leader())
  )
);

create policy "leaders manage prayer requests"
on public.prayer_requests
for update
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members view visible community updates"
on public.community_updates
for select
using (
  church_id = public.current_church_id()
  and (
    visibility in ('public', 'members')
    or (visibility = 'leaders_only' and public.is_admin_or_leader())
  )
);

create policy "leaders manage community updates"
on public.community_updates
for all
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "members view ministries in their church"
on public.ministries
for select
using (church_id = public.current_church_id());

create policy "leaders manage ministries"
on public.ministries
for all
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "leaders view notifications"
on public.notifications
for select
using (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "leaders manage notifications"
on public.notifications
for all
using (church_id = public.current_church_id() and public.is_admin_or_leader())
with check (church_id = public.current_church_id() and public.is_admin_or_leader());

create policy "leaders view audit logs"
on public.audit_logs
for select
using (church_id = public.current_church_id() and public.is_admin_or_leader());

revoke all on public.churches from anon, authenticated;
revoke all on public.members from anon, authenticated;
revoke all on public.roles from anon, authenticated;
revoke all on public.member_roles from anon, authenticated;
revoke all on public.invitation_tokens from anon, authenticated;
revoke all on public.announcements from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.event_rsvps from anon, authenticated;
revoke all on public.prayer_requests from anon, authenticated;
revoke all on public.community_updates from anon, authenticated;
revoke all on public.ministries from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select, insert, update on public.churches to authenticated;
grant select, insert, update on public.members to authenticated;
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.member_roles to authenticated;
grant select, insert, update, delete on public.invitation_tokens to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update on public.event_rsvps to authenticated;
grant select, insert, update on public.prayer_requests to authenticated;
grant select, insert, update, delete on public.community_updates to authenticated;
grant select, insert, update, delete on public.ministries to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.audit_logs to authenticated;
