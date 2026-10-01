-- Historial de lo que pasa con cada conversacion. Hasta ahora solo existia el
-- estado actual: no se podia saber cuantas veces el bot paso un cliente a un
-- humano ni cuanto tardo el equipo en tomarlo. En el modelo de Tourfy el bot
-- prepara al cliente y el agente cierra la venta, asi que esas son las
-- metricas que importan (no "atendidas solo por el bot").
--
-- Lo llena un trigger sobre conversations: registra el cambio venga de donde
-- venga (handoff de n8n via service role, API del dashboard, webhook, cron)
-- sin instrumentar cada camino. Los datos empiezan desde este deploy.

create table public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('handoff', 'taken', 'returned_to_bot', 'resolved', 'reopened')),
  -- Quien lo hizo: el agente que la tomo, o el usuario del dashboard. null =
  -- sistema (bot, webhook, cron).
  actor_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_conversation_events_org_created on public.conversation_events (org_id, created_at);
create index idx_conversation_events_conversation on public.conversation_events (conversation_id, created_at);

alter table public.conversation_events enable row level security;

-- Solo lectura para el dashboard; escribe unicamente el trigger. Revocar a
-- authenticated tambien: los default privileges de Supabase dan ALL (TRUNCATE
-- incluido) a cada tabla nueva.
revoke all on table public.conversation_events from anon, authenticated, public;
grant select on table public.conversation_events to authenticated;

create policy conversation_events_select_own_org on public.conversation_events
  for select to authenticated
  using (org_id = public.get_user_org_id());

-- SECURITY DEFINER: authenticated no puede insertar en la tabla, el trigger si.
create or replace function public.log_conversation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- El bot pidio un humano.
  if new.status = 'pending' and old.status is distinct from 'pending' then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'handoff', null);
  end if;

  -- Un agente la tomo (boton, respuesta directa o takeover de otro).
  if new.assigned_agent_id is not null and new.assigned_agent_id is distinct from old.assigned_agent_id then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'taken', new.assigned_agent_id);
  end if;

  -- Se resolvio (a mano o por el cron de inactividad).
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'resolved', v_actor);
  -- Se reabrio: el cliente volvio a escribir o alguien toco "Reabrir".
  elsif old.status = 'resolved' and new.status is distinct from 'resolved' then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'reopened', v_actor);
  -- Volvio al bot sin resolverse.
  elsif new.bot_active and not old.bot_active then
    insert into public.conversation_events (conversation_id, org_id, type, actor_id)
    values (new.id, new.org_id, 'returned_to_bot', v_actor);
  end if;

  return new;
end;
$$;

create trigger conversations_log_events
  after update of status, assigned_agent_id, bot_active on public.conversations
  for each row execute function public.log_conversation_event();

-- Metricas: suma 'handoff_events' (clientes que el bot paso a un humano) y
-- 'pickup' (mediana de cuanto tardo el equipo en tomarlos). El resto igual a
-- 20260930030000_org_metrics_handoffs_fix.sql.

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
-- Eventos de traspaso (conversation_events, desde 2026-09-30): clientes que
-- el bot paso a un humano y cuanto tardo el equipo en tomarlos.
handoff_events as (
  select e.conversation_id, e.created_at
  from public.conversation_events e
  join org on e.org_id = org.id
  cross join win
  where e.type = 'handoff' and e.created_at >= win.cur_from and e.created_at < win.cur_to
),
pickups as (
  select extract(epoch from (t.created_at - h.created_at)) as seconds
  from handoff_events h
  cross join lateral (
    select e.created_at
    from public.conversation_events e
    where e.conversation_id = h.conversation_id
      and e.type = 'taken'
      and e.created_at >= h.created_at
    order by e.created_at
    limit 1
  ) t
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
    where c.bot_active = false
       or c.assigned_agent_id is not null
       or exists (select 1 from cur where cur.conversation_id = a.conversation_id and cur.role = 'agent')),
  'handoff_events', (select count(*) from handoff_events),
  'pickup', jsonb_build_object(
    'median_seconds', (select percentile_cont(0.5) within group (order by seconds) from pickups),
    'samples', (select count(*) from pickups)),
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
