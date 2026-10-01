-- Metricas historicas (pedido de producto): ver un mes calendario completo
-- ("mes pasado", "agosto") y el historial de mensajes enviados por mes para
-- cruzarlo con la factura de Meta. Los meses se cortan en la zona horaria de
-- la agencia (mismo fallback que get_org_metrics).

-- Metricas de un mes calendario: delega en get_org_metrics con los limites
-- del mes en la zona de la agencia. p_month = cualquier dia del mes.
create or replace function public.get_org_metrics_month(p_month date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with org as (
    select case
      when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = o.bot_config->>'timezone')
        then o.bot_config->>'timezone'
      else 'America/Lima'
    end as tz
    from public.organizations o
    where o.id = public.get_user_org_id()
  )
  select public.get_org_metrics(
    date_trunc('month', p_month::timestamp) at time zone org.tz,
    (date_trunc('month', p_month::timestamp) + interval '1 month') at time zone org.tz
  ) || jsonb_build_object('month', to_char(date_trunc('month', p_month::timestamp), 'YYYY-MM'))
  from org
$$;

-- Mensajes enviados (bot + agentes) por mes, ultimos p_months meses incluido
-- el actual, en la zona de la agencia. Meses sin mensajes vuelven en 0.
create or replace function public.get_org_monthly_usage_history(p_months integer default 6)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with org as (
    select o.id, case
      when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = o.bot_config->>'timezone')
        then o.bot_config->>'timezone'
      else 'America/Lima'
    end as tz
    from public.organizations o
    where o.id = public.get_user_org_id()
  ),
  months as (
    select generate_series(
      date_trunc('month', now() at time zone org.tz) - make_interval(months => greatest(least(p_months, 24), 1) - 1),
      date_trunc('month', now() at time zone org.tz),
      interval '1 month'
    ) as m, org.tz, org.id
    from org
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(months.m, 'YYYY-MM'),
    'sent', (
      select count(*)
      from public.messages msg
      join public.conversations c on c.id = msg.conversation_id
      where c.org_id = months.id
        and msg.role in ('assistant', 'agent')
        and msg.created_at >= months.m at time zone months.tz
        and msg.created_at < (months.m + interval '1 month') at time zone months.tz
    )
  ) order by months.m), '[]'::jsonb)
  from months
$$;

revoke all on function public.get_org_metrics_month(date) from public, anon;
revoke all on function public.get_org_monthly_usage_history(integer) from public, anon;
grant execute on function public.get_org_metrics_month(date) to authenticated;
grant execute on function public.get_org_monthly_usage_history(integer) to authenticated;
