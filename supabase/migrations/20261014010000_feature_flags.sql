-- Feature flags por org: probar en prod sin ambiente local.
-- Un feature nuevo nace 'beta' en lib/features.ts y solo lo ven las orgs con
-- is_beta (las de prueba del equipo). `features` da acceso temprano a un
-- feature puntual a una agencia sin hacerla beta de todo.
-- Sin grant de UPDATE a authenticated: un admin no puede darse features a si
-- mismo (los grants por columna de organizations no incluyen estas columnas).
-- Se marcan con SQL desde el dashboard de Supabase (service role).
alter table public.organizations
  add column if not exists is_beta boolean not null default false,
  add column if not exists features text[] not null default '{}';
