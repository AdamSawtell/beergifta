/*
  Beer Gifta: board stats RPC, claim rate limit, top gifters (UTC calendar month).
  Paste this whole file into Supabase SQL Editor. Comments must use -- or /* */ only;
  a single leading "-" (from markdown lists) will cause a syntax error.
*/

create table if not exists public.beer_claim_velocity (
  id bigserial primary key,
  hit_at timestamptz not null default now()
);

create index if not exists idx_beer_claim_velocity_recent on public.beer_claim_velocity (hit_at desc);

alter table public.beer_claim_velocity enable row level security;

comment on table public.beer_claim_velocity is 'Anonymous claim RPC hits for rolling rate limit (no PII); managed only via security definer.';

revoke all on public.beer_claim_velocity from public;

-- One RPC replaces separate head-count + claimed_count queries.
create or replace function public.beer_gift_board_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'available',
    (select count(*)::bigint from public.beer_gifts where claimed = false and expires_at > now()),
    'claimed',
    (select count(*)::bigint from public.beer_gifts where claimed = true)
  );
$$;

comment on function public.beer_gift_board_stats() is 'Anonymous tallies for home page without exposing claimed row data.';

grant execute on function public.beer_gift_board_stats() to anon, authenticated;

-- Top gifters by rows created this calendar month (UTC).
create or replace function public.beer_gift_top_gifters_month(p_limit integer default 5)
returns table (gifted_by text, gift_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select b.gifted_by, count(*)::bigint as gift_count
  from public.beer_gifts b
  where b.created_at >= date_trunc('month', now())
  group by b.gifted_by
  order by gift_count desc, b.gifted_by asc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

comment on function public.beer_gift_top_gifters_month(integer) is 'Leaderboard: most gifts listed this UTC month by gifted_by.';

grant execute on function public.beer_gift_top_gifters_month(integer) to anon, authenticated;

create or replace function public.claim_beer_gift(p_id uuid, p_claimed_by text)
returns public.beer_gifts
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.beer_gifts;
  claimer text := trim(coalesce(p_claimed_by, ''));
begin
  if char_length(claimer) = 0 then
    raise exception 'Add your name to claim this beer.';
  end if;

  delete from public.beer_claim_velocity
  where hit_at < now() - interval '5 minutes';

  if (
    select count(*)::bigint
    from public.beer_claim_velocity
    where hit_at > now() - interval '1 minute'
  ) >= 40 then
    raise exception 'Too many claims right now. Try again in a minute.';
  end if;

  insert into public.beer_claim_velocity default values;

  update public.beer_gifts
  set
    claimed = true,
    claimed_at = now(),
    claimed_by = claimer
  where id = p_id
    and claimed = false
    and expires_at > now()
  returning * into r;

  if not found then
    return null;
  end if;

  return r;
end;
$$;

grant execute on function public.claim_beer_gift(uuid, text) to anon, authenticated;
