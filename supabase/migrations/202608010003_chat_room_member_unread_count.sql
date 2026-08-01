alter table public.chat_room_members
  add column if not exists unread_count integer not null default 0;

with last_reads as (
  select
    crm.room_id,
    crm.member_id,
    crm.last_read_message_id,
    msg.created_at as last_read_created_at
  from public.chat_room_members crm
  left join public.chat_messages msg
    on msg.id = crm.last_read_message_id
),
counts as (
  select
    lr.room_id,
    lr.member_id,
    count(m.id)::integer as unread_count
  from last_reads lr
  left join public.chat_messages m
    on m.room_id = lr.room_id
   and (
     lr.last_read_created_at is null
     or m.created_at > lr.last_read_created_at
   )
  group by lr.room_id, lr.member_id
)
update public.chat_room_members crm
set unread_count = counts.unread_count
from counts
where crm.room_id = counts.room_id
  and crm.member_id = counts.member_id;

create or replace function public.increment_chat_room_unread_counts(
  target_room_id uuid,
  sender_member_id_input uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_room_members
  set unread_count = unread_count + 1
  where room_id = target_room_id
    and member_id <> sender_member_id_input;
$$;

revoke all on function public.increment_chat_room_unread_counts(uuid, uuid) from public;
grant execute on function public.increment_chat_room_unread_counts(uuid, uuid) to authenticated;
