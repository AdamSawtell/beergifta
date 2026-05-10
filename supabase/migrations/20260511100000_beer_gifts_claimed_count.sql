-- Public tally of claimed beers (anon cannot SELECT claimed rows under RLS).

create or replace function public.beer_gifts_claimed_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint from public.beer_gifts where claimed = true;
$$;

comment on function public.beer_gifts_claimed_count() is 'All-time count of claimed beer_gifts rows; no row data exposed to anon.';

grant execute on function public.beer_gifts_claimed_count() to anon, authenticated;
