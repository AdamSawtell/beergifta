-- Home page "all time" tally: total beers submitted via Gift a Beer (all rows), not claimed-only.

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
    'gifted',
    (select count(*)::bigint from public.beer_gifts)
  );
$$;

comment on function public.beer_gift_board_stats() is 'Anonymous tallies for home page: available now and all-time gifts submitted.';

grant execute on function public.beer_gift_board_stats() to anon, authenticated;
