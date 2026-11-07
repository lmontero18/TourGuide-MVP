-- CODE-205: Recogidas y Reservas son Pro.
--
-- 1. save_pickups(): rechaza a una org Starter con el flag `plans`. Se copia
--    tal cual de 20261027010000_agent_knowledge.sql con ese chequeo agregado.
--    Las recogidas ya cargadas no se tocan: solo dejan de usarse (el bot de
--    Starter no las consulta, ver app/api/internal/pickups).
-- 2. bookings: las policies de insert/update/delete dejan escribir a cualquier
--    miembro de la org. Se suman policies restrictivas para que una org Starter
--    con el flag no escriba, ni por PostgREST directo. Leer sigue igual.
--
-- auth_org_starter_gated() viene de 20261107040000_metrics_by_plan.sql.

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

  -- Recogidas es Pro (CODE-205).
  if public.auth_org_starter_gated() then
    raise exception 'pro only' using errcode = '42501';
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

create policy bookings_pro_insert on public.bookings as restrictive
  for insert to authenticated with check (not public.auth_org_starter_gated());
create policy bookings_pro_update on public.bookings as restrictive
  for update to authenticated
  using (not public.auth_org_starter_gated())
  with check (not public.auth_org_starter_gated());
create policy bookings_pro_delete on public.bookings as restrictive
  for delete to authenticated using (not public.auth_org_starter_gated());
