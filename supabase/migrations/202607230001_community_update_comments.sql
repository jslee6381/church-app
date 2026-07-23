create table if not exists public.community_update_comments (
  id uuid primary key default gen_random_uuid(),
  community_update_id uuid not null references public.community_updates(id) on delete cascade,
  author_member_id uuid references public.members(id) on delete set null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_update_comments_update_id_idx
  on public.community_update_comments (community_update_id, created_at asc);

create trigger set_community_update_comments_updated_at
before update on public.community_update_comments
for each row execute function public.set_updated_at();

alter table public.community_update_comments enable row level security;

create policy "members view comments for visible community updates"
on public.community_update_comments
for select
using (
  exists (
    select 1
    from public.community_updates cu
    where cu.id = community_update_comments.community_update_id
      and cu.church_id = public.current_church_id()
      and (
        (
          cu.status = 'approved'
          and (
            cu.visibility in ('public', 'members')
            or (cu.visibility = 'leaders_only' and public.is_admin_or_leader())
          )
        )
        or (cu.author_member_id = public.current_member_id())
        or public.is_admin_or_leader()
      )
  )
);

create policy "approved members add community update comments"
on public.community_update_comments
for insert
with check (
  author_member_id = public.current_member_id()
  and exists (
    select 1
    from public.community_updates cu
    join public.members m on m.id = public.current_member_id()
    where cu.id = community_update_comments.community_update_id
      and cu.church_id = public.current_church_id()
      and cu.status = 'approved'
      and m.status = 'active'
  )
);

create policy "members edit their own community comments"
on public.community_update_comments
for update
using (author_member_id = public.current_member_id() or public.is_admin_or_leader())
with check (author_member_id = public.current_member_id() or public.is_admin_or_leader());

create policy "members delete their own community comments"
on public.community_update_comments
for delete
using (author_member_id = public.current_member_id() or public.is_admin_or_leader());

revoke all on public.community_update_comments from anon, authenticated;
grant select, insert, update, delete on public.community_update_comments to authenticated;
