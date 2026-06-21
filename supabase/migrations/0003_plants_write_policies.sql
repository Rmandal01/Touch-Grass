-- GrowFlow — allow authenticated users to read & write their own `plants` row.
--
-- The `plants` table (created outside this repo's migrations) has RLS enabled but
-- its existing read policy is scoped to the `anon` role, so a logged-in
-- (`authenticated`) user could neither read nor write their own plant. These
-- policies are additive and scope each user to ONLY the row whose user_id matches
-- their auth uid — no data is changed and existing read access / the seeded demo
-- row are untouched.
--
-- The select policy matters even for writes: PostgREST's UPDATE ... RETURNING (and
-- our existence check) need read access, or they come back empty and the client
-- wrongly falls through to an INSERT that collides on the user_id primary key.
--
-- user_id is a text column, so auth.uid() (uuid) is cast to text for comparison.

create policy "plants_select_own" on public.plants
  for select to authenticated
  using (auth.uid()::text = user_id);

create policy "plants_insert_own" on public.plants
  for insert to authenticated
  with check (auth.uid()::text = user_id);

create policy "plants_update_own" on public.plants
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
