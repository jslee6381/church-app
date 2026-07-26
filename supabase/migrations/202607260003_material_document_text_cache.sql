alter table public.video_posts
  add column if not exists question_doc_text text,
  add column if not exists manuscript_doc_text text;
