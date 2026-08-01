create type public.chat_room_role as enum ('owner', 'member');
create type public.chat_message_type as enum ('text', 'system');

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null,
  description text,
  created_by_member_id uuid references public.members(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  role public.chat_room_role not null default 'member',
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_message_id uuid,
  primary key (room_id, member_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_member_id uuid references public.members(id) on delete set null,
  message_type public.chat_message_type not null default 'text',
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_messages_body_not_blank check (length(trim(body)) > 0)
);

alter table public.chat_room_members
  add constraint chat_room_members_last_read_message_fk
  foreign key (last_read_message_id) references public.chat_messages(id) on delete set null;

create index if not exists chat_rooms_church_id_last_message_at_idx
  on public.chat_rooms (church_id, last_message_at desc nulls last, created_at desc);

create index if not exists chat_room_members_member_id_idx
  on public.chat_room_members (member_id, joined_at desc);

create index if not exists chat_messages_room_id_created_at_idx
  on public.chat_messages (room_id, created_at asc);

create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row execute function public.set_updated_at();

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

create policy "members view chat rooms they joined"
on public.chat_rooms
for select
using (
  church_id = public.current_church_id()
  and exists (
    select 1
    from public.chat_room_members crm
    where crm.room_id = chat_rooms.id
      and crm.member_id = public.current_member_id()
  )
);

create policy "active members create chat rooms in their church"
on public.chat_rooms
for insert
with check (
  church_id = public.current_church_id()
  and created_by_member_id = public.current_member_id()
);

create policy "room owners and leaders update chat rooms"
on public.chat_rooms
for update
using (
  church_id = public.current_church_id()
  and (
    public.is_admin_or_leader()
    or exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = chat_rooms.id
        and crm.member_id = public.current_member_id()
        and crm.role = 'owner'
    )
  )
)
with check (
  church_id = public.current_church_id()
  and (
    public.is_admin_or_leader()
    or exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = chat_rooms.id
        and crm.member_id = public.current_member_id()
        and crm.role = 'owner'
    )
  )
);

create policy "members view room members for joined rooms"
on public.chat_room_members
for select
using (
  exists (
    select 1
    from public.chat_room_members viewer
    join public.chat_rooms r on r.id = viewer.room_id
    where viewer.room_id = chat_room_members.room_id
      and viewer.member_id = public.current_member_id()
      and r.church_id = public.current_church_id()
  )
);

create policy "room owners and leaders manage room members"
on public.chat_room_members
for all
using (
  exists (
    select 1
    from public.chat_rooms r
    where r.id = chat_room_members.room_id
      and r.church_id = public.current_church_id()
      and (
        public.is_admin_or_leader()
        or exists (
          select 1
          from public.chat_room_members owner_link
          where owner_link.room_id = r.id
            and owner_link.member_id = public.current_member_id()
            and owner_link.role = 'owner'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.chat_rooms r
    join public.members m on m.id = chat_room_members.member_id
    where r.id = chat_room_members.room_id
      and r.church_id = public.current_church_id()
      and m.church_id = public.current_church_id()
      and (
        public.is_admin_or_leader()
        or exists (
          select 1
          from public.chat_room_members owner_link
          where owner_link.room_id = r.id
            and owner_link.member_id = public.current_member_id()
            and owner_link.role = 'owner'
        )
      )
  )
);

create policy "members view messages in joined rooms"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.chat_room_members crm
    join public.chat_rooms r on r.id = crm.room_id
    where crm.room_id = chat_messages.room_id
      and crm.member_id = public.current_member_id()
      and r.church_id = public.current_church_id()
  )
);

create policy "members send messages in joined rooms"
on public.chat_messages
for insert
with check (
  sender_member_id = public.current_member_id()
  and exists (
    select 1
    from public.chat_room_members crm
    join public.chat_rooms r on r.id = crm.room_id
    where crm.room_id = chat_messages.room_id
      and crm.member_id = public.current_member_id()
      and r.church_id = public.current_church_id()
  )
);

revoke all on public.chat_rooms from anon, authenticated;
revoke all on public.chat_room_members from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;

grant select, insert, update on public.chat_rooms to authenticated;
grant select, insert, update, delete on public.chat_room_members to authenticated;
grant select, insert on public.chat_messages to authenticated;
