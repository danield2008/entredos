-- EntreDos security hardening: shared-memory ownership and public room rate limits.
create table if not exists public.entredos_room_rate_limits (
  key_hash text not null,
  action text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  primary key (key_hash, action)
);
alter table public.entredos_room_rate_limits enable row level security;
revoke all on table public.entredos_room_rate_limits from public, anon, authenticated;
grant all on table public.entredos_room_rate_limits to service_role;

create or replace function public.entredos_consume_room_rate_limit(p_key_hash text,p_action text,p_max_attempts integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_attempts integer;
begin
  if p_key_hash is null or length(p_key_hash) < 16 or p_action not in ('create','join','join_code') or p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate-limit parameters';
  end if;
  insert into public.entredos_room_rate_limits(key_hash,action,window_started_at,attempts)
  values (p_key_hash,p_action,now(),1)
  on conflict (key_hash,action) do update
  set window_started_at = case when public.entredos_room_rate_limits.window_started_at <= now()-make_interval(secs=>p_window_seconds) then now() else public.entredos_room_rate_limits.window_started_at end,
      attempts = case when public.entredos_room_rate_limits.window_started_at <= now()-make_interval(secs=>p_window_seconds) then 1 else public.entredos_room_rate_limits.attempts+1 end
  returning attempts into v_attempts;
  return v_attempts <= p_max_attempts;
end;
$$;
revoke all on function public.entredos_consume_room_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.entredos_consume_room_rate_limit(text,text,integer,integer) to service_role;

drop policy if exists "memories update own" on public.entredos_memories;
create policy "memories update own" on public.entredos_memories for update to authenticated
using (owner_id=(select auth.uid()))
with check (owner_id=(select auth.uid()) and (couple_id is null or exists (
  select 1 from public.entredos_couple_members m where m.couple_id=entredos_memories.couple_id and m.user_id=(select auth.uid())
)));

drop policy if exists "memories insert own" on public.entredos_memories;
create policy "memories insert own" on public.entredos_memories for insert to authenticated
with check (owner_id=(select auth.uid()) and (couple_id is null or exists (
  select 1 from public.entredos_couple_members m where m.couple_id=entredos_memories.couple_id and m.user_id=(select auth.uid())
)));

revoke all on function public.entredos_create_invite() from public,anon;
grant execute on function public.entredos_create_invite() to authenticated;
revoke all on function public.entredos_accept_invite(text) from public,anon;
grant execute on function public.entredos_accept_invite(text) to authenticated;
revoke all on function public.entredos_unlink_couple() from public,anon;
grant execute on function public.entredos_unlink_couple() to authenticated;
revoke all on function public.entredos_handle_new_user() from public,anon,authenticated;
