alter table public.video_posts
  add column if not exists passage_verses jsonb;
