-- Beer Gifta: shared board. Run in Supabase SQL editor or via Supabase CLI.
-- After apply: Table Editor should show beer_gifts; anon can list/insert/claim per RLS below.

create table if not exists public.beer_gifts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  gifted_by text not null,
  expires_at timestamptz not null,
  note text,
  claimed boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint beer_gifts_code_len check (char_length(code) = 4)
);

create index if not exists idx_beer_gifts_list on public.beer_gifts (expires_at asc)
  where claimed = false;

comment on table public.beer_gifts is 'Fanzo Beer to Gift codes for Old Noarlunga tipping group.';

-- Preserve immutable fields when claiming (only claimed + claimed_at may change from client intent).
create or replace function public.beer_gifts_preserve_columns_on_claim()
returns trigger
language plpgsql
as $$
begin
  if old.claimed = true then
    raise exception 'Already claimed';
  end if;
  if new.claimed = true and old.claimed = false then
    new.code := old.code;
    new.gifted_by := old.gifted_by;
    new.expires_at := old.expires_at;
    new.note := old.note;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists beer_gifts_preserve_on_claim on public.beer_gifts;
create trigger beer_gifts_preserve_on_claim
  before update on public.beer_gifts
  for each row
  execute procedure public.beer_gifts_preserve_columns_on_claim();

alter table public.beer_gifts enable row level security;

-- Allow API role to hit the table; RLS still applies per policy.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.beer_gifts to anon, authenticated;

drop policy if exists "anon_select_available" on public.beer_gifts;
create policy "anon_select_available"
  on public.beer_gifts for select
  to anon, authenticated
  using (claimed = false and expires_at > now());

drop policy if exists "anon_insert_gift" on public.beer_gifts;
create policy "anon_insert_gift"
  on public.beer_gifts for insert
  to anon, authenticated
  with check (
    claimed = false
    and claimed_at is null
    and char_length(code) = 4
    and length(trim(gifted_by)) > 0
    and expires_at > now()
  );

drop policy if exists "anon_claim_update" on public.beer_gifts;
create policy "anon_claim_update"
  on public.beer_gifts for update
  to anon, authenticated
  using (claimed = false and expires_at > now())
  with check (
    claimed = true
    and claimed_at is not null
  );
