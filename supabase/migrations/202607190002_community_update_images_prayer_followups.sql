create table if not exists public.community_update_images (
  id uuid primary key default gen_random_uuid(),
  community_update_id uuid not null references public.community_updates(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_update_images_update_id_idx
  on public.community_update_images (community_update_id, sort_order asc, created_at asc);

create table if not exists public.prayer_request_follow_ups (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.prayer_requests(id) on delete cascade,
  author_member_id uuid references public.members(id) on delete set null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prayer_request_follow_ups_request_id_idx
  on public.prayer_request_follow_ups (prayer_request_id, created_at asc);

create trigger set_prayer_request_follow_ups_updated_at
before update on public.prayer_request_follow_ups
for each row execute function public.set_updated_at();

alter table public.community_update_images enable row level security;
alter table public.prayer_request_follow_ups enable row level security;

create policy "members view images for visible community updates"
on public.community_update_images
for select
using (
  exists (
    select 1
    from public.community_updates cu
    where cu.id = community_update_images.community_update_id
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

create policy "leaders manage community update images"
on public.community_update_images
for all
using (
  exists (
    select 1
    from public.community_updates cu
    where cu.id = community_update_images.community_update_id
      and cu.church_id = public.current_church_id()
      and public.is_admin_or_leader()
  )
)
with check (
  exists (
    select 1
    from public.community_updates cu
    where cu.id = community_update_images.community_update_id
      and cu.church_id = public.current_church_id()
      and public.is_admin_or_leader()
  )
);

create policy "members view allowed prayer follow ups"
on public.prayer_request_follow_ups
for select
using (
  exists (
    select 1
    from public.prayer_requests pr
    where pr.id = prayer_request_follow_ups.prayer_request_id
      and pr.church_id = public.current_church_id()
      and (
        pr.requester_member_id = public.current_member_id()
        or (
          pr.status = 'approved'
          and (
            pr.visibility = 'public'
            or (pr.visibility = 'small_group' and public.is_admin_or_leader())
            or (pr.visibility = 'leaders_only' and public.is_admin_or_leader())
          )
        )
        or public.is_admin_or_leader()
      )
  )
);

create policy "members add follow ups to their own prayer requests"
on public.prayer_request_follow_ups
for insert
with check (
  author_member_id = public.current_member_id()
  and exists (
    select 1
    from public.prayer_requests pr
    where pr.id = prayer_request_follow_ups.prayer_request_id
      and pr.church_id = public.current_church_id()
      and (
        pr.requester_member_id = public.current_member_id()
        or public.is_admin_or_leader()
      )
  )
);

create policy "members edit their own prayer follow ups"
on public.prayer_request_follow_ups
for update
using (author_member_id = public.current_member_id() or public.is_admin_or_leader())
with check (author_member_id = public.current_member_id() or public.is_admin_or_leader());

create policy "members delete their own prayer follow ups"
on public.prayer_request_follow_ups
for delete
using (author_member_id = public.current_member_id() or public.is_admin_or_leader());

revoke all on public.community_update_images from anon, authenticated;
revoke all on public.prayer_request_follow_ups from anon, authenticated;

grant select on public.community_update_images to authenticated;
grant select, insert, update, delete on public.prayer_request_follow_ups to authenticated;
