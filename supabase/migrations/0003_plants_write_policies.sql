-- GrowFlow — allow authenticated users to write their own `plants` row.
--
-- The `plants` table (created outside this repo's migrations) has RLS enabled
-- with read access but no write policy, so the client could not insert/update a
-- user's plant. These policies are additive and scope each user to ONLY the row
-- whose user_id matches their auth uid — no data is changed and existing read
-- access / the seeded demo row are untouched.
--
-- user_id is a text column, so auth.uid() (uuid) is cast to text for comparison.

create policy "plants_insert_own" on public.plants
  for insert to authenticated
  with check (auth.uid()::text = user_id);

create policy "plants_update_own" on public.plants
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
