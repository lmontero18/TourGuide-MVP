-- CODE-201: planes Starter ($200) y Pro ($300).
--
-- 1. plan_type queda en 'starter' | 'pro'. 'growth' nunca se uso: si alguna
--    fila lo tiene pasa a 'pro' (no pierde nada). Postgres no deja borrar un
--    valor de un enum, por eso se crea el tipo de nuevo.
-- 2. organizations.plan es la unica fuente de verdad para el acceso
--    (lib/features.ts › hasPlan). subscriptions.plan es lo que se cobra.
-- 3. Ecoterra y Sarapiqui quedan en Pro mientras se habla con cada una.
--
-- El admin sigue sin poder cambiar su plan: la columna no tiene grant de
-- UPDATE para authenticated (20260727120000_rls_lockdown.sql, "B bis").

update public.organizations set plan = 'pro' where plan = 'growth';
update public.subscriptions set plan = 'pro' where plan = 'growth';

alter type public.plan_type rename to plan_type_old;
create type public.plan_type as enum ('starter', 'pro');

alter table public.organizations
  alter column plan drop default,
  alter column plan type public.plan_type using plan::text::public.plan_type,
  alter column plan set default 'starter';

alter table public.subscriptions
  alter column plan drop default,
  alter column plan type public.plan_type using plan::text::public.plan_type,
  alter column plan set default 'starter';

drop type public.plan_type_old;

-- Ecoterra Costa Rica y Sarapiqui Outdoor Center (en local no existen: 0 filas).
update public.organizations set plan = 'pro'
 where id in ('d5c0ba71-c779-449f-a9a4-a944b8efa4c2', 'dabf06a5-90cc-4279-abc8-1ad5f48b57a0');
