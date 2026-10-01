-- Fix de get_org_monthly_usage: el mes cortaba a medianoche UTC. En
-- Centroamerica (UTC-6) eso es a las 6 PM del ultimo dia: la noche del 30 de
-- septiembre la card ya mostraba "octubre" con 7 mensajes en vez de 15.
--
-- Ahora el mes es el calendario de la agencia (bot_config.timezone, mismo
-- fallback que get_org_metrics). Meta no documenta en que zona reinicia el
-- tier gratis; para la agencia lo natural es su propio calendario.

create or replace function public.get_org_monthly_usage()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with org as (
  select
    o.id,
    case
      when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = o.bot_config->>'timezone')
        then o.bot_config->>'timezone'
      else 'America/Lima'
    end as tz
  from public.organizations o
  where o.id = public.get_user_org_id()
),
month_start as (
  select date_trunc('month', now() at time zone org.tz) at time zone org.tz as ts, org.tz
  from org
)
select jsonb_build_object(
  'period_start', (select ts from month_start),
  'timezone', (select tz from month_start),
  'sent', count(m.id)
)
from public.messages m
join public.conversations c on c.id = m.conversation_id
cross join month_start
where c.org_id = public.get_user_org_id()
  and m.role in ('assistant', 'agent')
  and m.created_at >= month_start.ts
$$;
