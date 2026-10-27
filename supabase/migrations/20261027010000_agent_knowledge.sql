-- Agentes editan Tours y preguntas (flag `agentKnowledge`) y se ve quien lo
-- modifico por ultima vez.
--
-- 1. organizations.knowledge_edits: ultima modificacion por seccion,
--    {"tours": {"at": "...", "by": "Tatiana"}, "faqs": {...}, ...}. "by" es el
--    nombre del usuario o, sin nombre, su correo: queda escrito tal cual aunque
--    el usuario cambie despues de nombre o se vaya.
-- 2. touch_knowledge(): la escribe con el usuario de la sesion. Los agentes no
--    pueden hacer UPDATE en organizations (policy org_update_admin_only), por
--    eso es security definer y solo toca knowledge_edits de la org propia.
-- 3. save_pickups(): admins siempre; agentes solo si la org tiene el flag
--    (is_beta o 'agentKnowledge' en features). Pasa a security definer porque
--    las policies de pickup_* siguen siendo solo admin para escritura directa.
--    Cuando el flag pase a 'live' en lib/features.ts, sacar la condicion de
--    can_edit_knowledge() en otra migracion.

alter table public.organizations
  add column knowledge_edits jsonb not null default '{}'::jsonb;

grant select (knowledge_edits) on public.organizations to authenticated;

create or replace function public.can_edit_knowledge()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    join public.organizations o on o.id = u.org_id
    where u.id = auth.uid()
      and (u.role = 'admin' or o.is_beta or 'agentKnowledge' = any(o.features))
  )
$$;

revoke all on function public.can_edit_knowledge() from public, anon;
grant execute on function public.can_edit_knowledge() to authenticated;

create or replace function public.touch_knowledge(p_sections text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
  v_name text;
  v_patch jsonb;
begin
  if v_org is null or not public.can_edit_knowledge() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select coalesce(nullif(btrim(u.full_name), ''), u.email)
    into v_name
    from public.users u
   where u.id = auth.uid();

  select jsonb_object_agg(s, jsonb_build_object('at', now(), 'by', v_name))
    into v_patch
    from (select distinct unnest(p_sections) as s) x
   where s in ('tours', 'faqs', 'business_info', 'pickups');

  if v_patch is null then
    return;
  end if;

  update public.organizations
     set knowledge_edits = knowledge_edits || v_patch
   where id = v_org;
end;
$$;

revoke all on function public.touch_knowledge(text[]) from public, anon;
grant execute on function public.touch_knowledge(text[]) to authenticated;

create or replace function public.save_pickups(p_zones jsonb, p_places jsonb, p_tours jsonb, p_times jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
begin
  if v_org is null or not public.can_edit_knowledge() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.pickup_times where org_id = v_org;
  delete from public.pickup_tours where org_id = v_org;
  delete from public.pickup_places where org_id = v_org;
  delete from public.pickup_zones where org_id = v_org;

  insert into public.pickup_zones (id, org_id, name, sort)
  select (z->>'id')::uuid, v_org, z->>'name', coalesce((z->>'sort')::int, 0)
  from jsonb_array_elements(coalesce(p_zones, '[]'::jsonb)) z;

  insert into public.pickup_places (id, org_id, zone_id, name, aliases)
  select (p->>'id')::uuid, v_org, (p->>'zone_id')::uuid, p->>'name',
         coalesce(array(select jsonb_array_elements_text(p->'aliases')), '{}')
  from jsonb_array_elements(coalesce(p_places, '[]'::jsonb)) p
  -- La FK no mira org_id: sin este filtro un hotel podria colgar de una zona
  -- de otra agencia.
  where exists (select 1 from public.pickup_zones z where z.id = (p->>'zone_id')::uuid and z.org_id = v_org);

  insert into public.pickup_tours (org_id, tour_id, departures, operator, sort)
  select v_org, t->>'tour_id', array(select jsonb_array_elements_text(t->'departures')),
         nullif(t->>'operator', ''), coalesce((t->>'sort')::int, 0)
  from jsonb_array_elements(coalesce(p_tours, '[]'::jsonb)) t;

  insert into public.pickup_times (org_id, tour_id, departure, zone_id, place_id, pickup_time)
  select v_org, x->>'tour_id', (x->>'departure')::smallint, (x->>'zone_id')::uuid,
         nullif(x->>'place_id', '')::uuid, x->>'pickup_time'
  from jsonb_array_elements(coalesce(p_times, '[]'::jsonb)) x
  where exists (select 1 from public.pickup_zones z where z.id = (x->>'zone_id')::uuid and z.org_id = v_org)
    and (nullif(x->>'place_id', '') is null
         or exists (select 1 from public.pickup_places pl where pl.id = (x->>'place_id')::uuid and pl.org_id = v_org));

  perform public.touch_knowledge(array['pickups']);
end;
$$;

revoke all on function public.save_pickups(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_pickups(jsonb, jsonb, jsonb, jsonb) to authenticated;
