create type public.community_reaction_kind as enum ('heart', 'like', 'pray');

alter table public.community_update_reactions
  add column if not exists reaction_kind public.community_reaction_kind not null default 'heart';
