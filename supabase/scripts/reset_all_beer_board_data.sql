/*
 * Beer Gifta — FULL reset (production / dev).
 *
 * Removes every row from beer_gifts: home “available”, “all time claimed”, “top gifters this month”, and all history → zero.
 *
 * Requires table beer_claim_velocity (from board-stats migration); if missing, skip the first statement.
 */

truncate table if exists public.beer_claim_velocity;
truncate table public.beer_gifts;
