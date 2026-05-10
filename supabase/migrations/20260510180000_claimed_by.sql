-- Require claimer display name when claiming; store alongside claimed_at.

alter table public.beer_gifts
  add column if not exists claimed_by text;

comment on column public.beer_gifts.claimed_by is 'Who took the Beer to Gift code (entered at claim time).';

drop policy if exists "anon_insert_gift" on public.beer_gifts;

create policy "anon_insert_gift"
  on public.beer_gifts for insert
  to anon, authenticated
  with check (
    claimed = false
    and claimed_at is null
    and claimed_by is null
    and char_length(code) = 4
    and length(trim(gifted_by)) > 0
    and expires_at > now()
  );

drop function if exists public.claim_beer_gift(uuid);

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
