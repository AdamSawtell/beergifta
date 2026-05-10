/*
 * Beer Gifta — FULL reset (production / dev).
 *
 * Removes every row from beer_gifts: home “available”, “all time claimed”, “top gifters this month”, and all history → zero.
 *
 * PostgreSQL TRUNCATE does NOT support IF EXISTS — we truncate beer_claim_velocity only when that table exists.
 */

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'beer_claim_velocity'
  ) then
    truncate table public.beer_claim_velocity;
  end if;
end $$;

truncate table public.beer_gifts;
