insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'material-documents',
  'material-documents',
  true,
  20971520,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.video_posts
  add column if not exists scheduled_at date,
  add column if not exists messenger_name text,
  add column if not exists passage_book text,
  add column if not exists passage_start_chapter integer,
  add column if not exists passage_start_verse integer,
  add column if not exists passage_end_chapter integer,
  add column if not exists passage_end_verse integer,
  add column if not exists question_doc_url text,
  add column if not exists question_doc_name text,
  add column if not exists manuscript_doc_url text,
  add column if not exists manuscript_doc_name text;

update public.video_posts
set
  scheduled_at = coalesce(scheduled_at, timezone('utc', created_at)::date),
  messenger_name = coalesce(messenger_name, title),
  passage_book = coalesce(passage_book, 'Genesis'),
  passage_start_chapter = coalesce(passage_start_chapter, 1),
  passage_start_verse = coalesce(passage_start_verse, 1),
  passage_end_chapter = coalesce(passage_end_chapter, 1),
  passage_end_verse = coalesce(passage_end_verse, 1)
where
  scheduled_at is null
  or messenger_name is null
  or passage_book is null
  or passage_start_chapter is null
  or passage_start_verse is null
  or passage_end_chapter is null
  or passage_end_verse is null;

alter table public.video_posts
  alter column scheduled_at set not null,
  alter column messenger_name set not null,
  alter column passage_book set not null,
  alter column passage_start_chapter set not null,
  alter column passage_start_verse set not null,
  alter column passage_end_chapter set not null,
  alter column passage_end_verse set not null,
  alter column video_link drop not null;
