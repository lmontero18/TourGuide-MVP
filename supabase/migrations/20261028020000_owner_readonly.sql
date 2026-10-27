-- El dueño (rol 'owner') ve Métricas del negocio y del equipo y nada más:
-- no escribe nada y el equipo no lo ve ("cuenta fantasma"). Tourfy crea la
-- cuenta a pedido de la agencia (docs/owner-accounts.md).
--
-- 1. Solo lectura: politicas RESTRICTIVE sobre las tablas que hoy escribe
--    cualquier miembro de la org (bookings, contacts, conversations, leads,
--    messages). Se suman a las permisivas que ya existen, sin tocarlas: para
--    admin y agente no cambia nada. Lo que ya es solo-admin (organizations,
--    whatsapp_accounts, pickup_*, borrar) no deja pasar a un owner. Las API
--    routes con service role lo chequean por su cuenta.
-- 2. Fantasma: los demas usuarios de la org no ven su fila en users (lista de
--    Agentes, "Asignar a…", nombres).
-- 3. leads.closed_by: quien marco la venta (o la perdida). Lo pone la API al
--    cerrar el lead; las ventas viejas quedan sin dueño.
-- 4. Metricas por agente: business_minutes() + get_team_metrics(), solo admin
--    y owner. Los tiempos cuentan solo dentro del horario de atencion.

-- 1. Solo lectura ------------------------------------------------------------

create policy bookings_no_owner_insert on public.bookings as restrictive
  for insert to authenticated with check (public.auth_role() is distinct from 'owner');
create policy bookings_no_owner_update on public.bookings as restrictive
  for update to authenticated using (public.auth_role() is distinct from 'owner');
create policy bookings_no_owner_delete on public.bookings as restrictive
  for delete to authenticated using (public.auth_role() is distinct from 'owner');

create policy contacts_no_owner_insert on public.contacts as restrictive
  for insert to authenticated with check (public.auth_role() is distinct from 'owner');
create policy contacts_no_owner_update on public.contacts as restrictive
  for update to authenticated using (public.auth_role() is distinct from 'owner');
create policy contacts_no_owner_delete on public.contacts as restrictive
  for delete to authenticated using (public.auth_role() is distinct from 'owner');

create policy conversations_no_owner_insert on public.conversations as restrictive
  for insert to authenticated with check (public.auth_role() is distinct from 'owner');
create policy conversations_no_owner_update on public.conversations as restrictive
  for update to authenticated using (public.auth_role() is distinct from 'owner');
create policy conversations_no_owner_delete on public.conversations as restrictive
  for delete to authenticated using (public.auth_role() is distinct from 'owner');

create policy leads_no_owner_insert on public.leads as restrictive
  for insert to authenticated with check (public.auth_role() is distinct from 'owner');
create policy leads_no_owner_update on public.leads as restrictive
  for update to authenticated using (public.auth_role() is distinct from 'owner');
create policy leads_no_owner_delete on public.leads as restrictive
  for delete to authenticated using (public.auth_role() is distinct from 'owner');

create policy messages_no_owner_insert on public.messages as restrictive
  for insert to authenticated with check (public.auth_role() is distinct from 'owner');
create policy messages_no_owner_update on public.messages as restrictive
  for update to authenticated using (public.auth_role() is distinct from 'owner');
create policy messages_no_owner_delete on public.messages as restrictive
  for delete to authenticated using (public.auth_role() is distinct from 'owner');

-- 2. Fantasma ----------------------------------------------------------------

create policy users_hide_owner on public.users as restrictive
  for select to authenticated using (id = auth.uid() or role::text <> 'owner');

-- 3. Quien cerro la venta ----------------------------------------------------

alter table public.leads
  add column closed_by uuid references public.users(id) on delete set null;

grant update (closed_by) on public.leads to authenticated;

-- 4. Metricas por agente -----------------------------------------------------

-- Minutos entre dos momentos que caen dentro del horario de atencion de la
-- agencia (bot_config.business_hours: weekdays y weekend {start, end}, weekend
-- null = cerrado). Sin horario cargado cuenta el tiempo corrido. Un mensaje de
-- las 23:00 contestado a las 8:30 con horario 7-21 son 90 min, no 9 h 30.
create or replace function public.business_minutes(p_from timestamptz, p_to timestamptz, p_tz text, p_hours jsonb)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_total numeric := 0;
  v_day date;
  v_last date;
  v_range jsonb;
  v_start timestamptz;
  v_end timestamptz;
begin
  if p_from is null or p_to is null or p_to <= p_from then
    return 0;
  end if;
  if p_hours is null or jsonb_typeof(p_hours->'weekdays') is distinct from 'object' then
    return extract(epoch from p_to - p_from) / 60;
  end if;

  v_day := (p_from at time zone p_tz)::date;
  -- Tope de 92 dias por las dudas: nadie espera mas que eso.
  v_last := least((p_to at time zone p_tz)::date, v_day + 92);
  while v_day <= v_last loop
    v_range := case when extract(isodow from v_day) in (6, 7) then p_hours->'weekend' else p_hours->'weekdays' end;
    if jsonb_typeof(v_range) = 'object' then
      v_start := (v_day + (v_range->>'start')::time) at time zone p_tz;
      v_end := (v_day + (v_range->>'end')::time) at time zone p_tz;
      v_total := v_total + greatest(0, extract(epoch from least(v_end, p_to) - greatest(v_start, p_from)) / 60);
    end if;
    v_day := v_day + 1;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.business_minutes(timestamptz, timestamptz, text, jsonb) from public, anon;
grant execute on function public.business_minutes(timestamptz, timestamptz, text, jsonb) to authenticated;

-- Una fila por admin/agente de la org (el owner no se cuenta a si mismo):
--   chats            conversaciones donde escribio en el periodo
--   messages         mensajes que mando
--   response_minutes mediana de cuanto tardo en contestar, en horario: desde
--                    el primer mensaje del cliente sin respuesta (o desde que
--                    el bot paso la conversacion al equipo) hasta su respuesta
--   unanswered       conversaciones asignadas, sin resolver, donde el cliente
--                    escribio ultimo (hoy, no en el periodo)
--   sales            leads Reservados en el periodo: los marco el (closed_by)
--                    o, si no se sabe quien, estaban asignados a el
--   sales_amount     suma de esos montos por moneda {"USD": 1200}
--   leads            leads del periodo en sus conversaciones (para la tasa de
--                    cierre)
-- Mas "team": la mediana de respuesta de todo el equipo junto.
-- Security invoker: lee con RLS de la org. Solo admin y owner.
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
    select a.sender_id, a.created_at as replied_at,
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
    select sender_id, public.business_minutes(asked_at, replied_at, v_tz, v_hours) as minutes
      from replies
     where asked_at is not null
  ),
  sold as (
    select coalesce(l.closed_by, c.assigned_agent_id) as user_id, l.amount, coalesce(l.currency, 'USD') as currency
      from public.leads l
      left join public.conversations c on c.id = l.conversation_id
     where l.org_id = v_org and l.status = 'converted' and l.closed_at >= p_from and l.closed_at < p_to
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
               and coalesce(l.closed_by, c.assigned_agent_id) = u.id) as leads
      from public.users u
     where u.org_id = v_org and u.role::text in ('admin', 'agent')
  )
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(to_jsonb(m) order by m.chats desc, m.name) from members m), '[]'::jsonb),
    'team', jsonb_build_object(
      'response_minutes', (select percentile_cont(0.5) within group (order by w.minutes) from waits w),
      'response_samples', (select count(*) from waits),
      'sales', (select count(*) from sold),
      'sales_amount', (select coalesce(jsonb_object_agg(x.currency, x.total), '{}'::jsonb)
                         from (select currency, sum(amount) as total from sold where amount is not null group by currency) x),
      'unassigned_sales', (select count(*) from sold where user_id is null)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_team_metrics(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_team_metrics(timestamptz, timestamptz) to authenticated;
