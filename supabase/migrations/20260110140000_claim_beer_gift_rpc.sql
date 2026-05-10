-- Fix claim from the browser: direct UPDATE + .select() fails because RLS only allows
-- SELECT on unclaimed rows, so RETURNING cannot read the row after it is claimed.
-- This RPC runs as definer, returns the claimed row once to the client.

create or replace function public.claim_beer_gift(p_id uuid)
returns public.beer_gifts
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.beer_gifts;
begin
  update public.beer_gifts
  set
    claimed = true,
    claimed_at = now()
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

grant execute on function public.claim_beer_gift(uuid) to anon, authenticated;
