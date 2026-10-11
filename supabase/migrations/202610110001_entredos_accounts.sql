-- EntreDos accounts, profiles, pair invitations, favorites and memories.
-- Additive migration: does not alter the existing online-room schema.
create extension if not exists pgcrypto;

create table if not exists public.entredos_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  anniversary date,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.entredos_couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  status text not null default 'pending' check (status in ('pending','linked','ended'))
);
create table if not exists public.entredos_couple_members (
  couple_id uuid not null references public.entredos_couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id,user_id)
);
create table if not exists public.entredos_couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.entredos_couples(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.entredos_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  question_text text not null,
  category text not null default 'General',
  created_at timestamptz not null default now(),
  unique (user_id,question_id)
);
create table if not exists public.entredos_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.entredos_couples(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 5000),
  event_date date,
  shared_with_partner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists entredos_members_user_idx on public.entredos_couple_members(user_id);
create index if not exists entredos_invites_code_idx on public.entredos_couple_invites(code);
create index if not exists entredos_memories_owner_idx on public.entredos_memories(owner_id);

create or replace function public.entredos_handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.entredos_profiles(user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name',''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists entredos_auth_user_created on auth.users;
create trigger entredos_auth_user_created after insert on auth.users
for each row execute procedure public.entredos_handle_new_user();

alter table public.entredos_profiles enable row level security;
alter table public.entredos_couples enable row level security;
alter table public.entredos_couple_members enable row level security;
alter table public.entredos_couple_invites enable row level security;
alter table public.entredos_favorites enable row level security;
alter table public.entredos_memories enable row level security;

drop policy if exists "profile read self" on public.entredos_profiles;
create policy "profile read self" on public.entredos_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "profile update self" on public.entredos_profiles;
create policy "profile update self" on public.entredos_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "profile insert self" on public.entredos_profiles;
create policy "profile insert self" on public.entredos_profiles for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "members see own couple memberships" on public.entredos_couple_members;
create policy "members see own couple memberships" on public.entredos_couple_members for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "couples visible to members" on public.entredos_couples;
create policy "couples visible to members" on public.entredos_couples for select to authenticated using (
  exists (select 1 from public.entredos_couple_members m where m.couple_id = id and m.user_id = (select auth.uid()))
);
drop policy if exists "favorites own" on public.entredos_favorites;
create policy "favorites own" on public.entredos_favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "memories read owner or consented partner" on public.entredos_memories;
create policy "memories read owner or consented partner" on public.entredos_memories for select to authenticated using (
  owner_id = (select auth.uid()) or (
    shared_with_partner and couple_id is not null and exists (
      select 1 from public.entredos_couple_members m
      where m.couple_id = entredos_memories.couple_id and m.user_id = (select auth.uid())
    )
  )
);
drop policy if exists "memories insert own" on public.entredos_memories;
create policy "memories insert own" on public.entredos_memories for insert to authenticated with check (
  owner_id = (select auth.uid()) and (
    couple_id is null or exists (
      select 1 from public.entredos_couple_members m
      where m.couple_id = entredos_memories.couple_id and m.user_id = (select auth.uid())
    )
  )
);
drop policy if exists "memories update own" on public.entredos_memories;
create policy "memories update own" on public.entredos_memories for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "memories delete own" on public.entredos_memories;
create policy "memories delete own" on public.entredos_memories for delete to authenticated using (owner_id = (select auth.uid()));

create or replace function public.entredos_create_invite()
returns table(couple_id uuid, invite_code text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_couple uuid; v_code text;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  if exists (select 1 from public.entredos_couple_members m join public.entredos_couples c on c.id=m.couple_id where m.user_id=v_user and c.status='linked') then
    raise exception 'Ya tienes una pareja vinculada. Desvincula primero la cuenta actual.';
  end if;
  select m.couple_id into v_couple from public.entredos_couple_members m join public.entredos_couples c on c.id=m.couple_id where m.user_id=v_user and c.status='pending' limit 1;
  if v_couple is null then
    insert into public.entredos_couples(created_by,status) values(v_user,'pending') returning id into v_couple;
    insert into public.entredos_couple_members(couple_id,user_id) values(v_couple,v_user);
  end if;
  v_code := upper(substr(encode(gen_random_bytes(8),'hex'),1,8));
  insert into public.entredos_couple_invites(couple_id,code,created_by) values(v_couple,v_code,v_user);
  return query select v_couple,v_code,now()+interval '7 days';
end;
$$;
create or replace function public.entredos_accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_inv public.entredos_couple_invites%rowtype; v_count integer;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_inv from public.entredos_couple_invites i
  where i.code=upper(trim(p_code)) and i.used_at is null and i.expires_at>now()
  for update;
  if not found then raise exception 'El código no existe, ha caducado o ya se ha usado.'; end if;
  if v_inv.created_by=v_user then raise exception 'La invitación debe aceptarla la otra persona.'; end if;
  if exists (select 1 from public.entredos_couple_members m join public.entredos_couples c on c.id=m.couple_id where m.user_id=v_user and c.status='linked') then
    raise exception 'Ya tienes una pareja vinculada.';
  end if;
  select count(*) into v_count from public.entredos_couple_members where couple_id=v_inv.couple_id;
  if v_count >= 2 then raise exception 'Esta pareja ya tiene dos miembros.'; end if;
  insert into public.entredos_couple_members(couple_id,user_id) values(v_inv.couple_id,v_user) on conflict do nothing;
  update public.entredos_couple_invites set used_at=now() where id=v_inv.id;
  update public.entredos_couples set status='linked',linked_at=now() where id=v_inv.couple_id;
  return v_inv.couple_id;
end;
$$;
revoke all on function public.entredos_create_invite() from public;
grant execute on function public.entredos_create_invite() to authenticated;
revoke all on function public.entredos_accept_invite(text) from public;
grant execute on function public.entredos_accept_invite(text) to authenticated;
grant select, insert, update on public.entredos_profiles to authenticated;
grant select on public.entredos_couple_members, public.entredos_couples to authenticated;
grant select, insert, update, delete on public.entredos_favorites, public.entredos_memories to authenticated;
