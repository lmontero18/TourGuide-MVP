-- Recogidas (flag `pickups`): a que hora se pasa a recoger al cliente segun
-- su hotel, por tour y salida. Las agencias lo llevan en un Excel hotel × tour;
-- aca se guarda por zona (hoteles con las mismas horas) con excepciones por
-- hotel, para que el equipo lo edite en Tours › Recogidas y el bot lo consulte.
--
--   pickup_zones   zona de recogida ("Centro La Fortuna")
--   pickup_places  hoteles de cada zona, con alias para que el bot los encuentre
--   pickup_tours   salidas de cada tour ("Mañana", "Tarde") y su operador
--   pickup_times   hora por tour + salida + zona; con place_id es la excepcion
--                  de ese hotel
--
-- Los tours viven en organizations.tours (jsonb), asi que tour_id es el id del
-- tour dentro del jsonb, no una FK.
--
-- Lee todo el equipo de la org; escribe solo el admin. El guardado reemplaza
-- todo de una vez (save_pickups) para que la tabla no quede a medias.

create table public.pickup_zones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.pickup_places (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  zone_id uuid not null references public.pickup_zones(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.pickup_tours (
  org_id uuid not null references public.organizations(id) on delete cascade,
  tour_id text not null check (char_length(tour_id) between 1 and 64),
  departures text[] not null check (cardinality(departures) between 1 and 8),
  operator text check (char_length(operator) <= 120),
  sort integer not null default 0,
  primary key (org_id, tour_id)
);

create table public.pickup_times (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  tour_id text not null,
  departure smallint not null check (departure between 0 and 7),
  zone_id uuid not null references public.pickup_zones(id) on delete cascade,
  place_id uuid references public.pickup_places(id) on delete cascade,
  pickup_time text not null check (pickup_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  unique nulls not distinct (org_id, tour_id, departure, zone_id, place_id)
);

create index idx_pickup_zones_org on public.pickup_zones (org_id, sort);
create index idx_pickup_places_org on public.pickup_places (org_id);
create index idx_pickup_places_zone on public.pickup_places (zone_id);
create index idx_pickup_times_org_tour on public.pickup_times (org_id, tour_id);
create index idx_pickup_times_zone on public.pickup_times (zone_id);
create index idx_pickup_times_place on public.pickup_times (place_id);

alter table public.pickup_zones enable row level security;
alter table public.pickup_places enable row level security;
alter table public.pickup_tours enable row level security;
alter table public.pickup_times enable row level security;

-- Los default privileges de Supabase dan ALL (TRUNCATE incluido) a cada tabla
-- nueva: se revoca todo y se otorga solo lo que usa la app.
revoke all on table public.pickup_zones, public.pickup_places, public.pickup_tours, public.pickup_times
  from anon, authenticated, public;
grant select, insert, delete on table public.pickup_zones, public.pickup_places, public.pickup_tours, public.pickup_times
  to authenticated;

create policy pickup_zones_select_own_org on public.pickup_zones
  for select to authenticated using (org_id = public.auth_org_id());
create policy pickup_zones_insert_admin on public.pickup_zones
  for insert to authenticated
  with check (org_id = public.auth_org_id() and public.auth_role() = 'admin');
create policy pickup_zones_delete_admin on public.pickup_zones
  for delete to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() = 'admin');

create policy pickup_places_select_own_org on public.pickup_places
  for select to authenticated using (org_id = public.auth_org_id());
create policy pickup_places_insert_admin on public.pickup_places
  for insert to authenticated
  with check (org_id = public.auth_org_id() and public.auth_role() = 'admin');
create policy pickup_places_delete_admin on public.pickup_places
  for delete to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() = 'admin');

create policy pickup_tours_select_own_org on public.pickup_tours
  for select to authenticated using (org_id = public.auth_org_id());
create policy pickup_tours_insert_admin on public.pickup_tours
  for insert to authenticated
  with check (org_id = public.auth_org_id() and public.auth_role() = 'admin');
create policy pickup_tours_delete_admin on public.pickup_tours
  for delete to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() = 'admin');

create policy pickup_times_select_own_org on public.pickup_times
  for select to authenticated using (org_id = public.auth_org_id());
create policy pickup_times_insert_admin on public.pickup_times
  for insert to authenticated
  with check (org_id = public.auth_org_id() and public.auth_role() = 'admin');
create policy pickup_times_delete_admin on public.pickup_times
  for delete to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() = 'admin');

-- Reemplaza todas las recogidas de la org en una transaccion. SECURITY INVOKER:
-- corre con las policies de arriba, asi que un agente no puede guardar y un
-- admin solo toca su org. Los ids los manda el cliente (uuid) para que las
-- zonas y hoteles conserven su id entre guardados.
create or replace function public.save_pickups(p_zones jsonb, p_places jsonb, p_tours jsonb, p_times jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
begin
  if v_org is null or public.auth_role() is distinct from 'admin' then
    raise exception 'admin only' using errcode = '42501';
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
end;
$$;

revoke all on function public.save_pickups(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_pickups(jsonb, jsonb, jsonb, jsonb) to authenticated;
