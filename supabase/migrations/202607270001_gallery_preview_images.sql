alter table public.gallery_posts
  add column if not exists preview_images jsonb;
