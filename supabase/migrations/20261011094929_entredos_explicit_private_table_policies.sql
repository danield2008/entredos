-- Explicitly document that private tables are only accessible through trusted backend RPCs.
drop policy if exists "private invites deny api roles" on public.entredos_couple_invites;
create policy "private invites deny api roles" on public.entredos_couple_invites
for all to anon, authenticated using (false) with check (false);

drop policy if exists "private rooms deny api roles" on public.entredos_rooms;
create policy "private rooms deny api roles" on public.entredos_rooms
for all to anon, authenticated using (false) with check (false);

drop policy if exists "private room answers deny api roles" on public.entredos_room_answers;
create policy "private room answers deny api roles" on public.entredos_room_answers
for all to anon, authenticated using (false) with check (false);

drop policy if exists "private rate limits deny api roles" on public.entredos_room_rate_limits;
create policy "private rate limits deny api roles" on public.entredos_room_rate_limits
for all to anon, authenticated using (false) with check (false);
