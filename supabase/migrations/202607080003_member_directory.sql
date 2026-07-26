create type public.contact_visibility as enum ('public', 'leaders_only', 'hide_contact');

alter table public.members
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists ministry_id uuid references public.ministries(id) on delete set null,
  add column if not exists small_group text;

update public.members
set display_name = full_name
where display_name is null;

alter table public.members
  alter column display_name set not null;

alter table public.directory_visibility_settings
  add column if not exists phone_visibility public.contact_visibility not null default 'hide_contact',
  add column if not exists email_visibility public.contact_visibility not null default 'hide_contact';

update public.directory_visibility_settings
set phone_visibility =
  case
    when show_phone then 'public'::public.contact_visibility
    else 'hide_contact'::public.contact_visibility
  end,
  email_visibility =
  case
    when show_email then 'public'::public.contact_visibility
    else 'hide_contact'::public.contact_visibility
  end
where phone_visibility is null
   or email_visibility is null;

create index if not exists members_display_name_idx on public.members (church_id, display_name);
create index if not exists members_ministry_id_idx on public.members (ministry_id);
