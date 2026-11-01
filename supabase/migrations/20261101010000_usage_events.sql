-- Uso del panel por persona: que pantallas ven y que acciones hacen (tomar
-- control, mover un lead, marcar una venta, mandar un archivo...). Sirve para
-- entender por que una agencia usa o no una funcion.
--
-- - Solo el server escribe (service role): /api/usage para lo que pasa en el
--   navegador (pantallas, busquedas, filtros) y los API routes para las
--   acciones. authenticated no tiene ningun privilegio sobre la tabla.
-- - No guarda contenido de conversaciones ni datos de turistas: solo el
--   nombre del evento, la ruta (con los ids reemplazados por :id) y props
--   chicas (ej. {"from": "new", "to": "converted"}).
-- - Retencion: 180 dias (pg_cron diario).
create table public.usage_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  event text not null check (char_length(event) <= 60),
  path text check (char_length(path) <= 200),
  device text check (device in ('mobile', 'desktop')),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;
revoke all on public.usage_events from anon, authenticated;

create index usage_events_org_created_idx on public.usage_events (org_id, created_at desc);
create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);

select cron.schedule(
  'tourfy-usage-retention',
  '30 7 * * *',
  $$delete from public.usage_events where created_at < now() - interval '180 days'$$
);
