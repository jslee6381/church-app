alter table public.chat_rooms
  add column if not exists last_message_text text;

update public.chat_rooms as rooms
set last_message_text = latest.body
from (
  select distinct on (room_id)
    room_id,
    body
  from public.chat_messages
  order by room_id, created_at desc
) as latest
where latest.room_id = rooms.id
  and rooms.last_message_text is null;
