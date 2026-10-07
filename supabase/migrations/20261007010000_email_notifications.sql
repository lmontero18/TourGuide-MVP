-- Correos transaccionales (ver artifact "Correos de Tourfy"):
-- traspaso sin atender a los 5 min, pago rechazado por Meta, resumen diario,
-- plantilla aprobada/rechazada y "nueva agencia" para el equipo de Tourfy.

-- 1) Registro de envios: idempotencia (un correo por dedupe_key, aunque el
--    cron o el webhook corran dos veces) y trazabilidad. Solo service role.
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  kind text not null,
  dedupe_key text not null unique,
  recipients text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_email_log_org_created on public.email_log (org_id, created_at desc);
alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated, public;

-- 2) Preferencia por usuario: el resumen diario se puede apagar.
alter table public.users
  add column if not exists email_daily_summary boolean not null default true;
grant update (email_daily_summary) on public.users to authenticated;

-- 3) Crons: pg_cron llama a las rutas de la app con pg_net (decision: jobs
--    diferidos con pg_cron; QStash recien con muchos clientes). La URL y el
--    secreto viven en Vault (no en el repo): sin ellos el job no hace nada.
--      select vault.create_secret('https://www.tourfy.app', 'app_base_url');
--      select vault.create_secret('<CRON_SECRET de Vercel>', 'cron_secret');
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.call_app_cron(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_secret text;
begin
  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_base is null or v_secret is null then
    return;
  end if;
  perform net.http_get(
    url := v_base || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function private.call_app_cron(text) from public, anon, authenticated;

-- Traspasos sin atender: cada minuto. Resumen diario: cada hora (la ruta
-- manda a las agencias donde son las 8:00 en su zona horaria).
select cron.schedule('tourfy-handoff-alerts', '* * * * *', $$select private.call_app_cron('/api/cron/handoff-alerts')$$);
select cron.schedule('tourfy-daily-summary', '0 * * * *', $$select private.call_app_cron('/api/cron/daily-summary')$$);
