create table if not exists public.community_update_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  community_update_comment_id uuid not null references public.community_update_comments(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  reaction_kind text not null check (reaction_kind in ('heart', 'like')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (community_update_comment_id, member_id)
);

create index if not exists community_update_comment_reactions_comment_id_idx
  on public.community_update_comment_reactions (community_update_comment_id);

alter table public.community_update_comment_reactions enable row level security;

create policy "members view comment reactions for visible comments"
on public.community_update_comment_reactions
for select
using (
  exists (
    select 1
    from public.community_update_comments cuc
    join public.community_updates cu on cu.id = cuc.community_update_id
    where cuc.id = community_update_comment_reactions.community_update_comment_id
      and cu.church_id = public.current_church_id()
      and (
        (
          cu.status = 'approved'
          and (
            cu.visibility in ('public', 'members')
            or (cu.visibility = 'leaders_only' and public.is_admin_or_leader())
          )
        )
        or cu.author_member_id = public.current_member_id()
        or public.is_admin_or_leader()
      )
  )
);

create policy "approved members react to community comments"
on public.community_update_comment_reactions
for insert
with check (
  member_id = public.current_member_id()
  and exists (
    select 1
    from public.community_update_comments cuc
    join public.community_updates cu on cu.id = cuc.community_update_id
    join public.members m on m.id = public.current_member_id()
    where cuc.id = community_update_comment_reactions.community_update_comment_id
      and cu.church_id = public.current_church_id()
      and cu.status = 'approved'
      and m.status = 'active'
  )
);

create policy "members update their own comment reactions"
on public.community_update_comment_reactions
for update
using (member_id = public.current_member_id())
with check (member_id = public.current_member_id());

create policy "members delete their own comment reactions"
on public.community_update_comment_reactions
for delete
using (member_id = public.current_member_id());

revoke all on public.community_update_comment_reactions from anon, authenticated;
grant select, insert, update, delete on public.community_update_comment_reactions to authenticated;
