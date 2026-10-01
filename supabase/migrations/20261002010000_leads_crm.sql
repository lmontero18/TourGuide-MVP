-- Panel de leads (CRM): la IA llena la ficha de cada oportunidad a partir de
-- la conversacion y el equipo la mueve por el embudo.
--
-- Etapas (lead_status existente): new = Nuevo, contacted = Cotizando,
-- qualified = Listo para cerrar, converted = Reservado, lost = Perdido.
-- La IA solo avanza new → contacted → qualified; converted/lost los marca
-- una persona (converted con monto).
--
-- Ficha: tour en tour_interest; el resto de campos en metadata
-- {travel_date, group_size, quote, pickup, needs, language}. Un campo que
-- edita un agente entra a locked_fields y la IA ya no lo pisa.

alter table public.leads
  add column if not exists summary text,
  add column if not exists next_step text,
  add column if not exists intent text check (intent in ('browsing', 'quoting', 'ready')),
  add column if not exists locked_fields text[] not null default '{}',
  add column if not exists amount numeric(12, 2) check (amount is null or amount >= 0),
  add column if not exists currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  add column if not exists extracted_at timestamptz,
  add column if not exists closed_at timestamptz;

-- Una sola oportunidad abierta por conversacion (evita duplicados si llegan
-- dos mensajes a la vez). Las cerradas (reservado/perdido) quedan de historial.
create unique index if not exists leads_one_open_per_conversation
  on public.leads (conversation_id)
  where status not in ('converted', 'lost');

-- Tablero: leads de la org por etapa, mas recientes primero.
create index if not exists idx_leads_org_status_updated
  on public.leads (org_id, status, updated_at desc);

-- Los crea y los llena el server (service role). El equipo los lee y los
-- edita desde el panel (RLS por org ya existente: select/update own org).
revoke all on public.leads from anon, public;
revoke insert, delete, truncate, references, trigger on public.leads from authenticated;
grant select, update on public.leads to authenticated;

-- Tablero en vivo.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
