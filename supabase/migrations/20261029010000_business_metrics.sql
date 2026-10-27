-- Metricas del negocio para el dueño y los admins (flag teamMetrics):
--
-- 1. get_team_metrics() suma:
--    - members[].last_used: ultimo mensaje que mando cada persona (siempre,
--      no solo en el periodo), para ver quien no usa su cuenta.
--    - team.long_waits: conversaciones donde un cliente espero mas de 1 hora
--      (en horario de atencion) a que el equipo le contestara en el periodo.
--    - team.handoffs_unanswered: veces que el bot paso la conversacion al
--      equipo en el periodo y nadie del equipo escribio despues.
-- 2. get_business_metrics(): ventas, consultas, embudo, tours mas pedidos y
--    clientes esperando ahora. Solo admin y owner.
--
-- Ventas y montos salen de los leads marcados como Reservado: si el equipo no
-- marca una venta, no aparece (la pantalla lo dice).

create or replace function public.get_team_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_org uuid := public.get_user_org_id();
  v_role text := public.auth_role();
  v_tz text;
  v_hours jsonb;
  v_result jsonb;
begin
  if v_org is null or v_role is null or v_role not in ('admin', 'owner') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select case when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = o.bot_config->>'timezone')
              then o.bot_config->>'timezone' else 'America/Lima' end,
         o.bot_config->'business_hours'
    into v_tz, v_hours
    from public.organizations o
   where o.id = v_org;

  with msgs as (
    -- Una semana antes del periodo para encontrar la pregunta de una
    -- respuesta que cae al principio.
    select m.conversation_id, m.role, m.sender_id, m.created_at
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
     where c.org_id = v_org
       and c.deleted_at is null
       and m.created_at >= p_from - interval '7 days'
       and m.created_at < p_to
  ),
  replies as (
    select a.conversation_id, a.sender_id, a.created_at as replied_at,
      least(
        -- primer mensaje del cliente despues de la ultima respuesta (bot o equipo)
        (select min(u.created_at) from msgs u
          where u.conversation_id = a.conversation_id and u.role = 'user' and u.created_at < a.created_at
            and u.created_at > coalesce((select max(x.created_at) from msgs x
                                          where x.conversation_id = a.conversation_id and x.role in ('agent', 'assistant')
                                            and x.created_at < a.created_at), '-infinity'::timestamptz)),
        -- o el traspaso del bot al equipo despues de la ultima respuesta humana
        (select max(e.created_at) from public.conversation_events e
          where e.conversation_id = a.conversation_id and e.type = 'handoff' and e.created_at < a.created_at
            and e.created_at > coalesce((select max(x.created_at) from msgs x
                                          where x.conversation_id = a.conversation_id and x.role = 'agent'
                                            and x.created_at < a.created_at), '-infinity'::timestamptz))
      ) as asked_at
      from msgs a
     where a.role = 'agent' and a.sender_id is not null and a.created_at >= p_from
  ),
  waits as (
    select conversation_id, sender_id, public.business_minutes(asked_at, replied_at, v_tz, v_hours) as minutes
      from replies
     where asked_at is not null
  ),
  sold as (
    select coalesce(l.closed_by, c.assigned_agent_id) as user_id, l.amount, coalesce(l.currency, 'USD') as currency
      from public.leads l
      left join public.conversations c on c.id = l.conversation_id
     where l.org_id = v_org and l.status = 'converted' and l.closed_at >= p_from and l.closed_at < p_to
  ),
  handoffs as (
    select e.conversation_id, e.created_at
      from public.conversation_events e
      join public.conversations c on c.id = e.conversation_id
     where e.org_id = v_org and c.deleted_at is null and e.type = 'handoff'
       and e.created_at >= p_from and e.created_at < p_to
  ),
  members as (
    select u.id,
           coalesce(nullif(btrim(u.full_name), ''), u.email) as name,
           u.role::text as role,
           (select count(distinct m.conversation_id) from msgs m where m.sender_id = u.id and m.role = 'agent' and m.created_at >= p_from) as chats,
           (select count(*) from msgs m where m.sender_id = u.id and m.role = 'agent' and m.created_at >= p_from) as messages,
           (select percentile_cont(0.5) within group (order by w.minutes) from waits w where w.sender_id = u.id) as response_minutes,
           (select count(*) from waits w where w.sender_id = u.id) as response_samples,
           (select count(*) from public.conversations c
             where c.org_id = v_org and c.deleted_at is null and c.assigned_agent_id = u.id and c.status <> 'resolved'
               and (select m.role from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) = 'user') as unanswered,
           (select count(*) from sold s where s.user_id = u.id) as sales,
           (select coalesce(jsonb_object_agg(x.currency, x.total), '{}'::jsonb)
              from (select s.currency, sum(s.amount) as total from sold s
                     where s.user_id = u.id and s.amount is not null group by s.currency) x) as sales_amount,
           (select count(*) from public.leads l
              left join public.conversations c on c.id = l.conversation_id
             where l.org_id = v_org and l.created_at >= p_from and l.created_at < p_to
               and coalesce(l.closed_by, c.assigned_agent_id) = u.id) as leads,
           (select max(m.created_at) from public.messages m where m.sender_id = u.id and m.role = 'agent') as last_used
      from public.users u
     where u.org_id = v_org and u.role::text in ('admin', 'agent')
  )
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(to_jsonb(m) order by m.chats desc, m.name) from members m), '[]'::jsonb),
    'team', jsonb_build_object(
      'response_minutes', (select percentile_cont(0.5) within group (order by w.minutes) from waits w),
      'response_samples', (select count(*) from waits),
      'long_waits', (select count(distinct w.conversation_id) from waits w where w.minutes > 60),
      'handoffs', (select count(*) from handoffs),
      'handoffs_unanswered', (select count(*) from handoffs h
                               where not exists (select 1 from public.messages m
                                                  where m.conversation_id = h.conversation_id and m.role = 'agent'
                                                    and m.created_at > h.created_at)),
      'sales', (select count(*) from sold),
      'sales_amount', (select coalesce(jsonb_object_agg(x.currency, x.total), '{}'::jsonb)
                         from (select currency, sum(amount) as total from sold where amount is not null group by currency) x),
      'unassigned_sales', (select count(*) from sold where user_id is null)
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Lo que mira el dueño primero. Periodo [p_from, p_to) y el anterior de igual
-- largo para comparar:
--   sales / sales_prev     Reservados cerrados en el periodo: count y monto por moneda
--   leads / leads_prev     consultas nuevas (leads creados)
--   funnel                 leads creados en el periodo segun su etapa de hoy
--   top_tours              los 8 tours mas consultados en el periodo y cuantos
--                          de esos ya son Reservado. La IA escribe el tour de
--                          interes a su manera ("Puentes colgantes + Catarata
--                          La Fortuna + Arenal Volcano..."): se parte en "+",
--                          " y ", " and " y cada parte se busca en el catalogo
--                          de la agencia (organizations.tours). Lo que no
--                          esta en el catalogo queda con su texto.
--   waiting / waiting_count  clientes esperando al equipo ahora: el cliente
--                          escribio ultimo (sin contar reacciones) y no lo
--                          tiene el bot, o el bot la paso y nadie la tomo.
--                          Los 10 que mas esperan.
create or replace function public.get_business_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_org uuid := public.get_user_org_id();
  v_role text := public.auth_role();
  v_prev_from timestamptz := p_from - (p_to - p_from);
  v_result jsonb;
begin
  if v_org is null or v_role is null or v_role not in ('admin', 'owner') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  with sold as (
    select l.amount, coalesce(l.currency, 'USD') as currency, l.closed_at >= p_from as current
      from public.leads l
     where l.org_id = v_org and l.status = 'converted' and l.closed_at >= v_prev_from and l.closed_at < p_to
  ),
  created as (
    select l.id, l.status::text as status, l.tour_interest, l.created_at >= p_from as current
      from public.leads l
     where l.org_id = v_org and l.created_at >= v_prev_from and l.created_at < p_to
  ),
  catalog as (
    select btrim(t->>'name') as name
      from public.organizations o, jsonb_array_elements(coalesce(o.tours, '[]'::jsonb)) t
     where o.id = v_org and nullif(btrim(t->>'name'), '') is not null
  ),
  parts as (
    select c.id, c.status, btrim(p) as part
      from created c, regexp_split_to_table(c.tour_interest, '\s*(\+| y | and )\s*') p
     where c.current
       and lower(btrim(coalesce(c.tour_interest, ''))) not in ('', 'null', 'none', 'ninguno')
       and length(btrim(p)) >= 4
  ),
  matched as (
    select distinct p.id, p.status,
           coalesce((select k.name from catalog k
                      where lower(k.name) = lower(p.part)
                         or position(lower(k.name) in lower(p.part)) > 0
                         or (length(p.part) >= 8 and position(lower(p.part) in lower(k.name)) > 0)
                      order by (lower(k.name) = lower(p.part)) desc, length(k.name) desc
                      limit 1), p.part) as name
      from parts p
  ),
  tours as (
    select name, count(distinct id) as leads, count(distinct id) filter (where status = 'converted') as sales
      from matched
     group by name
     order by 2 desc, 1
     limit 8
  ),
  waiting as (
    select c.id as conversation_id,
           coalesce(nullif(btrim(ct.name), ''), ct.phone) as name,
           c.last_message_at as since,
           coalesce(nullif(btrim(u.full_name), ''), u.email) as assignee
      from public.conversations c
      join public.contacts ct on ct.id = c.contact_id
      left join public.users u on u.id = c.assigned_agent_id
     where c.org_id = v_org and c.deleted_at is null and c.status <> 'resolved' and not c.bot_active
       and ((select m.role = 'user' and m.content not like '[reaction]%'
               from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1)
            or (c.status = 'pending' and c.assigned_agent_id is null))
  )
  select jsonb_build_object(
    'sales', jsonb_build_object(
      'count', (select count(*) from sold where current),
      'amount', (select coalesce(jsonb_object_agg(x.currency, x.total), '{}'::jsonb)
                   from (select currency, sum(amount) as total from sold where current and amount is not null group by currency) x)),
    'sales_prev', jsonb_build_object(
      'count', (select count(*) from sold where not current),
      'amount', (select coalesce(jsonb_object_agg(x.currency, x.total), '{}'::jsonb)
                   from (select currency, sum(amount) as total from sold where not current and amount is not null group by currency) x)),
    'leads', (select count(*) from created where current),
    'leads_prev', (select count(*) from created where not current),
    'funnel', (select jsonb_build_object(
                 'new', count(*) filter (where status = 'new'),
                 'contacted', count(*) filter (where status = 'contacted'),
                 'qualified', count(*) filter (where status = 'qualified'),
                 'converted', count(*) filter (where status = 'converted'),
                 'lost', count(*) filter (where status = 'lost'))
                 from created where current),
    'top_tours', coalesce((select jsonb_agg(jsonb_build_object('name', t.name, 'leads', t.leads, 'sales', t.sales)
                                            order by t.leads desc, t.name) from tours t), '[]'::jsonb),
    'waiting_count', (select count(*) from waiting),
    'waiting', coalesce((select jsonb_agg(to_jsonb(w) order by w.since)
                           from (select * from waiting order by since limit 10) w), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_business_metrics(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_business_metrics(timestamptz, timestamptz) to authenticated;
