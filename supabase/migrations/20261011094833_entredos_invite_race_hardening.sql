-- Prevent stale or concurrent invites from linking an ended couple or adding >2 members.
create or replace function public.entredos_accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_inv public.entredos_couple_invites%rowtype; v_status text; v_count integer;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_code is null or length(trim(p_code))<6 or length(trim(p_code))>12 then raise exception 'El código no existe, ha caducado o ya se ha usado.'; end if;
  select * into v_inv from public.entredos_couple_invites i where i.code=upper(trim(p_code)) and i.used_at is null and i.expires_at>now() for update;
  if not found then raise exception 'El código no existe, ha caducado o ya se ha usado.'; end if;
  if v_inv.created_by=v_user then raise exception 'La invitación debe aceptarla la otra persona.'; end if;
  select c.status into v_status from public.entredos_couples c where c.id=v_inv.couple_id for update;
  if not found or v_status<>'pending' then raise exception 'Esta invitación ya no está activa.'; end if;
  if exists (select 1 from public.entredos_couple_members m join public.entredos_couples c on c.id=m.couple_id where m.user_id=v_user and c.status in ('pending','linked')) then
    raise exception 'Ya tienes una pareja o invitación pendiente.';
  end if;
  select count(*) into v_count from public.entredos_couple_members where couple_id=v_inv.couple_id;
  if v_count<>1 then raise exception 'Esta invitación ya no está disponible.'; end if;
  insert into public.entredos_couple_members(couple_id,user_id) values(v_inv.couple_id,v_user);
  update public.entredos_couple_invites set used_at=now() where id=v_inv.id;
  update public.entredos_couples set status='linked',linked_at=now() where id=v_inv.couple_id;
  return v_inv.couple_id;
end;
$$;
revoke all on function public.entredos_accept_invite(text) from public,anon;
grant execute on function public.entredos_accept_invite(text) to authenticated;
