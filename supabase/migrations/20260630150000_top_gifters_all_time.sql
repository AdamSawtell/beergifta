-- Top gifters leaderboard: all-time count by gifted_by (not UTC month).

create or replace function public.beer_gift_top_gifters(p_limit integer default 5)
returns table (gifted_by text, gift_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select b.gifted_by, count(*)::bigint as gift_count
  from public.beer_gifts b
  group by b.gifted_by
  order by gift_count desc, b.gifted_by asc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

comment on function public.beer_gift_top_gifters(integer) is 'Leaderboard: most gifts submitted all time by gifted_by.';

grant execute on function public.beer_gift_top_gifters(integer) to anon, authenticated;
