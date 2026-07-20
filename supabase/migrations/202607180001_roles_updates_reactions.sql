create type public.community_update_status as enum ('pending', 'approved', 'rejected', 'archived');

alter table public.events
  add column if not exists image_url text;

alter table public.community_updates
  add column if not exists status public.community_update_status not null default 'approved',
  add column if not exists approved_by_member_id uuid references public.members(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists archived_at timestamptz;

create table if not exists public.community_update_reactions (
  community_update_id uuid not null references public.community_updates(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (community_update_id, member_id)
);

create index if not exists community_update_reactions_update_id_idx
  on public.community_update_reactions (community_update_id);

create index if not exists community_updates_church_id_status_idx
  on public.community_updates (church_id, status, published_at desc);

alter table public.community_update_reactions enable row level security;

drop policy if exists "members view visible community updates" on public.community_updates;

create policy "members view approved community updates"
on public.community_updates
for select
using (
  church_id = public.current_church_id()
  and (
    (
      status = 'approved'
      and (
        visibility in ('public', 'members')
        or (visibility = 'leaders_only' and public.is_admin_or_leader())
      )
    )
    or (
      author_member_id = public.current_member_id()
      and status in ('pending', 'rejected', 'archived')
    )
    or public.is_admin_or_leader()
  )
);

create policy "members submit community updates"
on public.community_updates
for insert
with check (
  church_id = public.current_church_id()
  and author_member_id = public.current_member_id()
  and status = 'pending'
  and approved_by_member_id is null
  and approved_at is null
);

create policy "members view community update reactions"
on public.community_update_reactions
for select
using (
  exists (
    select 1
    from public.community_updates cu
    where cu.id = community_update_reactions.community_update_id
      and cu.church_id = public.current_church_id()
      and cu.status = 'approved'
  )
);

create policy "members react to approved community updates"
on public.community_update_reactions
for insert
with check (
  member_id = public.current_member_id()
  and exists (
    select 1
    from public.community_updates cu
    where cu.id = community_update_reactions.community_update_id
      and cu.church_id = public.current_church_id()
      and cu.status = 'approved'
  )
);

create policy "members remove their community update reactions"
on public.community_update_reactions
for delete
using (member_id = public.current_member_id());

revoke all on public.community_update_reactions from anon, authenticated;
grant select, insert, delete on public.community_update_reactions to authenticated;
