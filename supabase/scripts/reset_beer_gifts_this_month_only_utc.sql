/*
 * Beer Gifta — softer reset for “top gifters this month” only (UTC month).
 *
 * Deletes rows LISTED since the start of the current UTC calendar month.
 * Older rows stay unchanged (past months still count toward all-time totals on the home page).
 */

delete from public.beer_gifts
where created_at >= date_trunc('month', (now() at time zone 'utc'));
