alter table public.entredos_rooms add column if not exists intensity text not null default 'romantico' check (intensity in ('suave','romantico','profundo','atrevido'));
