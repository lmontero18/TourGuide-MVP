-- CODE-173 · Uso del tier gratis de mensajes de servicio de WhatsApp.
--
-- Desde 2026-10-01 Meta cobra los mensajes de servicio (respuestas de texto
-- libre dentro de la ventana de 24h) con 1.000 gratis por mes por numero. Cada
-- org tiene un numero, asi que se cuenta por org: mensajes que ENVIAMOS (bot
-- + agentes) desde el 1 del mes. El tope (1.000) vive en el frontend.
--
-- Es un estimado: el dato facturable real lo tiene Meta (pricing en webhooks
-- de estado / Analytics API). Mes calendario en UTC — Meta no documenta en que
-- zona reinicia; ajustar si resulta ser otra.
--
-- SECURITY INVOKER + get_user_org_id(): mismas garantias que get_org_metrics.

create or replace function public.get_org_monthly_usage()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with month_start as (
  select date_trunc('month', now() at time zone 'utc') at time zone 'utc' as ts
)
select jsonb_build_object(
  'period_start', (select ts from month_start),
  'sent', count(*)
)
from public.messages m
join public.conversations c on c.id = m.conversation_id
cross join month_start
where c.org_id = public.get_user_org_id()
  and m.role in ('assistant', 'agent')
  and m.created_at >= month_start.ts
$$;

revoke all on function public.get_org_monthly_usage() from public, anon;
grant execute on function public.get_org_monthly_usage() to authenticated;
