alter table public.events
add column if not exists is_live_stream boolean not null default false,
add column if not exists live_stream_url text;
