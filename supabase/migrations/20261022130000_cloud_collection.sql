create table public.collection_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 150),
  card jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  deleted boolean not null default false,
  mutation_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint valid_collection_card check (
    jsonb_typeof(card) = 'object' and octet_length(card::text) <= 4000000 and
    card ?& array['id','name','number','set','scannedAt','quantity'] and
    jsonb_typeof(card->'id') = 'string' and card->>'id' = id and jsonb_typeof(card->'name') = 'string' and
    length(card->>'name') between 1 and 200 and
    jsonb_typeof(card->'number') = 'string' and length(card->>'number') between 1 and 100 and
    jsonb_typeof(card->'set') = 'string' and length(card->>'set') <= 200 and
    jsonb_typeof(card->'scannedAt') = 'string' and
    jsonb_typeof(card->'quantity') = 'number' and
    (card->>'quantity')::numeric between 1 and 9999 and
    (card->>'quantity')::numeric = trunc((card->>'quantity')::numeric)
  )
);
alter table public.collection_cards enable row level security;
revoke all on public.collection_cards from public, anon, authenticated;
grant select on public.collection_cards to authenticated;
create policy "Read own collection" on public.collection_cards for select to authenticated
using ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));

-- Writes go through this function so revisions and tombstones cannot be bypassed.
-- Revision checks prevent one device from silently overwriting another device's edits.
create function public.write_collection_card(
  p_id text, p_card jsonb, p_expected_revision bigint, p_deleted boolean, p_mutation_id uuid
) returns setof public.collection_cards
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_row public.collection_cards;
begin
  if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_mutation_id is null or p_deleted is null then
    raise exception 'INVALID_COLLECTION_WRITE' using errcode = '22023';
  end if;
  -- Lock the row across the idempotency check and the conditional update.
  select * into v_row from public.collection_cards where user_id = v_user and id = p_id for update;
  if found then
    if v_row.mutation_id = p_mutation_id then return next v_row; return; end if;
    if v_row.revision <> p_expected_revision then raise exception 'COLLECTION_CONFLICT'; end if;
    update public.collection_cards set card = p_card, revision = revision + 1,
      deleted = p_deleted, mutation_id = p_mutation_id, updated_at = clock_timestamp()
      where user_id = v_user and id = p_id returning * into v_row;
  else
    if p_expected_revision <> 0 then raise exception 'COLLECTION_CONFLICT'; end if;
    insert into public.collection_cards(user_id, id, card, deleted, mutation_id)
      values(v_user, p_id, p_card, p_deleted, p_mutation_id)
      on conflict(user_id, id) do nothing returning * into v_row;
    if not found then
      select * into v_row from public.collection_cards where user_id = v_user and id = p_id;
      if v_row.mutation_id <> p_mutation_id then raise exception 'COLLECTION_CONFLICT'; end if;
    end if;
  end if;
  return next v_row;
end;
$$;
revoke all on function public.write_collection_card(text, jsonb, bigint, boolean, uuid) from public, anon;
grant execute on function public.write_collection_card(text, jsonb, bigint, boolean, uuid) to authenticated;
notify pgrst, 'reload schema';
