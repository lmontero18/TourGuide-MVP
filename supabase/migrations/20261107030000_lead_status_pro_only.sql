-- CODE-203: en Starter la agencia no cambia el estado del lead (Nuevo,
-- Contactado, Listo, Reservado, Perdido). El estado es de la ficha completa,
-- que es Pro. Corregir datos y anotar el monto sigue abierto en los dos planes.
--
-- authenticated tiene UPDATE sobre toda la tabla leads (20261002010000), asi
-- que no alcanza con la API: este trigger lo frena tambien si alguien llama a
-- PostgREST directo. Solo aplica a sesiones de usuario (auth.uid() no nulo):
-- el bot y los crons usan service role y siguen moviendo el estado igual.
--
-- Mismo criterio que hasPlan(org, 'pro') en lib/features.ts mientras el flag
-- `plans` esta en 'beta': solo bloquea a orgs con el flag (is_beta o 'plans' en
-- features) y plan 'starter'. Cuando `plans` pase a 'live', otra migracion saca
-- la condicion del flag.

create or replace function public.leads_status_pro_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and auth.uid() is not null then
    if exists (
      select 1
        from public.organizations o
       where o.id = old.org_id
         and o.plan = 'starter'
         and (o.is_beta or 'plans' = any(o.features))
    ) then
      raise exception 'lead status is a Pro feature' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.leads_status_pro_only() from public, anon, authenticated;

drop trigger if exists leads_status_pro_only on public.leads;
create trigger leads_status_pro_only
  before update of status on public.leads
  for each row execute function public.leads_status_pro_only();
