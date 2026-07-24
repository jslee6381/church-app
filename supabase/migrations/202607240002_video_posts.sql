create table if not exists public.video_posts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  author_member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  body text,
  video_link text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists video_posts_church_created_at_idx
  on public.video_posts (church_id, created_at desc);

alter table public.video_posts enable row level security;

drop policy if exists "video_posts_select_for_members" on public.video_posts;
create policy "video_posts_select_for_members"
  on public.video_posts
  for select
  using (true);

drop policy if exists "video_posts_manage_by_service_role" on public.video_posts;
create policy "video_posts_manage_by_service_role"
  on public.video_posts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists set_video_posts_updated_at on public.video_posts;
create trigger set_video_posts_updated_at
before update on public.video_posts
for each row execute function public.set_updated_at();
