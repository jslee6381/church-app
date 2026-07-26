create table if not exists public.gallery_posts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  author_member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  body text,
  drive_link text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists gallery_posts_church_created_at_idx
  on public.gallery_posts (church_id, created_at desc);

alter table public.gallery_posts enable row level security;

drop policy if exists "gallery_posts_select_for_members" on public.gallery_posts;
create policy "gallery_posts_select_for_members"
  on public.gallery_posts
  for select
  using (true);

drop policy if exists "gallery_posts_manage_by_service_role" on public.gallery_posts;
create policy "gallery_posts_manage_by_service_role"
  on public.gallery_posts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists set_gallery_posts_updated_at on public.gallery_posts;
create trigger set_gallery_posts_updated_at
before update on public.gallery_posts
for each row execute function public.set_updated_at();
