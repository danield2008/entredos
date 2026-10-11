-- Remove default public execution from private account functions and allow account owners to unlink.
revoke all on function public.entredos_handle_new_user() from public, anon, authenticated;
revoke all on function public.entredos_create_invite() from public, anon;
revoke all on function public.entredos_accept_invite(text) from public, anon;
grant execute on function public.entredos_create_invite() to authenticated;
grant execute on function public.entredos_accept_invite(text) to authenticated;

create or replace function public.entredos_unlink_couple()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_couple uuid;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  select m.couple_id into v_couple
  from public.entredos_couple_members m
  join public.entredos_couples c on c.id=m.couple_id
  where m.user_id=v_user and c.status='linked' limit 1;
  if v_couple is null then raise exception 'No tienes una pareja vinculada.'; end if;
  update public.entredos_couples set status='ended' where id=v_couple;
  delete from public.entredos_couple_members where couple_id=v_couple;
  return true;
end;
$$;
revoke all on function public.entredos_unlink_couple() from public, anon;
grant execute on function public.entredos_unlink_couple() to authenticated;
