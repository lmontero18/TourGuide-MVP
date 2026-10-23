-- Reservas (flag `bookings`): quien va a que tour cada dia, con hotel y hora de
-- recogida. El equipo las crea desde la ficha de un lead Reservado; la pantalla
-- Reservas las lista por dia, ordenadas por hora de recogida.
--
-- Un lead puede tener varias (dos tours en dias distintos). El contacto y la
-- conversacion salen del lead. tour_id es el id del tour dentro de
-- organizations.tours (jsonb), no una FK; tour_name guarda el nombre por si el
-- tour se borra o se renombra despues. departure y pickup_time se guardan como
-- texto: son lo que el equipo confirmo, no un indice que cambia si se edita la
-- tabla de Recogidas.
--
-- Lee y escribe todo el equipo de la org (como los leads): es trabajo diario.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  tour_id text check (char_length(tour_id) <= 64),
  tour_name text not null check (char_length(tour_name) between 1 and 200),
  date date not null,
  departure text check (char_length(departure) <= 40),
  pax smallint check (pax between 1 and 500),
  place text check (char_length(place) <= 200),
  pickup_time text check (pickup_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  notes text check (char_length(notes) <= 500),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_org_date on public.bookings (org_id, date);
create index idx_bookings_lead on public.bookings (lead_id);

create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

-- Los default privileges de Supabase dan ALL (TRUNCATE incluido) a cada tabla
-- nueva: se revoca todo y se otorga solo lo que usa la app.
revoke all on table public.bookings from anon, authenticated, public;
grant select, insert, update, delete on table public.bookings to authenticated;

create policy bookings_select_own_org on public.bookings
  for select to authenticated using (org_id = public.auth_org_id());
-- La FK de lead_id no mira org_id: sin el exists se podria colgar una reserva
-- de un lead de otra agencia.
create policy bookings_insert_own_org on public.bookings
  for insert to authenticated
  with check (
    org_id = public.auth_org_id()
    and exists (select 1 from public.leads l where l.id = lead_id and l.org_id = public.auth_org_id())
  );
create policy bookings_update_own_org on public.bookings
  for update to authenticated
  using (org_id = public.auth_org_id())
  with check (
    org_id = public.auth_org_id()
    and exists (select 1 from public.leads l where l.id = lead_id and l.org_id = public.auth_org_id())
  );
create policy bookings_delete_own_org on public.bookings
  for delete to authenticated using (org_id = public.auth_org_id());
