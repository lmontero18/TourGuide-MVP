-- CODE-165 · Metricas capa 1 ("¿el bot trabaja?") calculadas en Postgres.
--
-- Por que una funcion y no queries desde Next: messages no tiene org_id (hay
-- que joinear conversations) y PostgREST corta en 1000 filas — traer mensajes
-- crudos para agregar en JS se rompe con la primera agencia con trafico.
--
-- SECURITY INVOKER: corre con los permisos de quien llama, asi que las
-- policies *_own_org de conversations/messages/contacts siguen aplicando. La
-- org sale de get_user_org_id(), nunca de un parametro del cliente.
--
-- Definiciones:
--   * conversacion activa = tiene >= 1 mensaje del cliente en el periodo
--     (cada contacto tiene UNA conversacion de por vida, contar creadas no
--     mide actividad).
--   * fuera de horario = mensaje del cliente fuera de bot_config.business_hours
--     en la timezone de la org. Mismo normalizado que lib/bot/businessHours.ts:
--     sin horario -> 09:00-18:00 todos los dias; formato viejo (un rango) ->
--     mismo rango todos los dias; weekend null -> finde cerrado.
--   * tiempo de respuesta = desde el PRIMER mensaje de una rafaga del cliente
--     hasta la respuesta del bot (el buffer de n8n junta la rafaga). Si lo
--     siguiente fue un agente, no cuenta para el bot.
--   * transferida = conversacion activa que hoy tiene bot_active = false o
--     agente asignado (estado actual, no historico).

create or replace function public.get_org_metrics(p_from timestamptz, p_to timestamptz)
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
    end as tz,
    o.bot_config->'business_hours' as bh
  from public.organizations o
  where o.id = public.get_user_org_id()
),
hours as (
  select
    org.id,
    org.tz,
    case
      when org.bh is null or jsonb_typeof(org.bh) <> 'object' then '{"start":"09:00","end":"18:00"}'::jsonb
      when org.bh ? 'weekdays' then org.bh->'weekdays'
      else org.bh
    end as wd,
    case
      when org.bh is null or jsonb_typeof(org.bh) <> 'object' then '{"start":"09:00","end":"18:00"}'::jsonb
      when org.bh ? 'weekdays' then nullif(org.bh->'weekend', 'null'::jsonb)
      else org.bh
    end as we
  from org
),
win as (
  select p_from as cur_from, p_to as cur_to, p_from - (p_to - p_from) as prev_from
),
msgs as (
  select m.conversation_id, m.role, m.created_at
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  join org on c.org_id = org.id
  cross join win
  where m.created_at >= win.prev_from and m.created_at < win.cur_to
),
cur as (
  select msgs.* from msgs, win where msgs.created_at >= win.cur_from
),
client_cur as (
  select
    cur.conversation_id,
    cur.created_at,
    (cur.created_at at time zone hours.tz) as local_ts,
    extract(isodow from (cur.created_at at time zone hours.tz))::int as dow,
    hours.wd,
    hours.we
  from cur, hours
  where cur.role = 'user'
),
classified as (
  select
    cc.conversation_id,
    cc.created_at,
    cc.local_ts::date as local_date,
    case
      when cc.dow >= 6 then 'weekend'
      when cc.local_ts::time >= (cc.wd->>'end')::time then 'evening'
      else 'night'
    end as slot,
    not coalesce(
      cc.local_ts::time >= ((case when cc.dow >= 6 then cc.we else cc.wd end)->>'start')::time
      and cc.local_ts::time < ((case when cc.dow >= 6 then cc.we else cc.wd end)->>'end')::time,
      false
    ) as after_hours
  from client_cur cc
),
after_hours_first as (
  select distinct on (conversation_id) conversation_id, slot
  from classified
  where after_hours
  order by conversation_id, created_at
),
burst_starts as (
  select b.conversation_id, b.created_at
  from (
    select cur.conversation_id, cur.role, cur.created_at,
           lag(cur.role) over (partition by cur.conversation_id order by cur.created_at) as prev_role
    from cur
  ) b
  where b.role = 'user' and b.prev_role is distinct from 'user'
),
responses as (
  select extract(epoch from (nxt.created_at - bs.created_at)) as seconds
  from burst_starts bs
  cross join lateral (
    select cur.role, cur.created_at
    from cur
    where cur.conversation_id = bs.conversation_id
      and cur.created_at > bs.created_at
      and cur.role <> 'user'
    order by cur.created_at
    limit 1
  ) nxt
  where nxt.role = 'assistant'
    and nxt.created_at - bs.created_at < interval '1 day'
),
active_cur as (
  select distinct conversation_id from cur where role = 'user'
),
days as (
  select d::date as local_date
  from hours, win,
       generate_series(
         (win.cur_from at time zone hours.tz)::date,
         ((win.cur_to - interval '1 microsecond') at time zone hours.tz)::date,
         interval '1 day'
       ) d
)
select jsonb_build_object(
  'timezone', (select tz from hours),
  'active_conversations', (select count(*) from active_cur),
  'active_conversations_prev', (
    select count(distinct msgs.conversation_id) from msgs, win
    where msgs.role = 'user' and msgs.created_at < win.cur_from),
  'new_contacts', (
    select count(*) from public.contacts ct join org on ct.org_id = org.id, win
    where ct.created_at >= win.cur_from and ct.created_at < win.cur_to),
  'new_contacts_prev', (
    select count(*) from public.contacts ct join org on ct.org_id = org.id, win
    where ct.created_at >= win.prev_from and ct.created_at < win.cur_from),
  'messages', jsonb_build_object(
    'client', (select count(*) from cur where role = 'user'),
    'bot', (select count(*) from cur where role = 'assistant'),
    'agent', (select count(*) from cur where role = 'agent')),
  'handoffs', (
    select count(*) from active_cur a
    join public.conversations c on c.id = a.conversation_id
    where c.bot_active = false or c.assigned_agent_id is not null),
  'after_hours', jsonb_build_object(
    'conversations', (select count(*) from after_hours_first),
    'messages', (select count(*) from classified where after_hours),
    'evening', (select count(*) from after_hours_first where slot = 'evening'),
    'night', (select count(*) from after_hours_first where slot = 'night'),
    'weekend', (select count(*) from after_hours_first where slot = 'weekend')),
  'response_time', jsonb_build_object(
    'median_seconds', (select percentile_cont(0.5) within group (order by seconds) from responses),
    'samples', (select count(*) from responses)),
  'daily', coalesce((
    select jsonb_agg(jsonb_build_object(
             'date', days.local_date,
             'conversations', (select count(distinct cl.conversation_id) from classified cl where cl.local_date = days.local_date))
           order by days.local_date)
    from days), '[]'::jsonb)
)
$$;

revoke all on function public.get_org_metrics(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_org_metrics(timestamptz, timestamptz) to authenticated;
