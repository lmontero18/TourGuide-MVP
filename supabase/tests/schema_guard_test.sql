-- supabase/tests/schema_guard_test.sql
-- =====================================================================
-- GUARDA DE SCHEMA (CODE-151 / M8).
--
-- Los otros dos archivos prueban escenarios. Este prueba INVARIANTES: reglas
-- que tienen que valer para toda tabla y toda policy, incluidas las que todavia
-- no existen. Cualquiera de estos asserts habria frenado el bug de `embeddings`
-- (policy sin clausula TO + GRANT ALL a anon) antes del merge.
--
-- Por que este archivo y no un event trigger: public.rls_auto_enable() existe en
-- el baseline (:194-220) pero nunca se creo el CREATE EVENT TRIGGER. Y aunque se
-- creara, solo activaria RLS — no impide un GRANT a anon ni una policy permisiva
-- sin TO, que es exactamente lo que paso. Ademas crear event triggers necesita
-- superusuario: local lo es, Supabase hosted no, asi que la migracion pasaria el
-- CI y fallaria en el push a prod.
--
-- Cada assert devuelve el string_agg de los nombres que incumplen, no un boolean:
-- cuando falla, el diff de pgTAP dice QUE tabla o QUE policy quedo mal.
-- =====================================================================

begin;
select plan(7);

-- ---------------------------------------------------------------------
-- 1. Toda tabla de public tiene RLS habilitado.
-- ---------------------------------------------------------------------
select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  '',
  'Toda tabla de public tiene RLS habilitado');

-- ---------------------------------------------------------------------
-- 2. Una tabla sin policies solo es segura si tampoco tiene grants.
--    RLS activo + cero policies = deny total (service_role la sigue viendo por
--    BYPASSRLS). Pero RLS activo + cero policies + GRANT a anon es una tabla que
--    parece cerrada y no lo esta en cuanto alguien le agregue una policy laxa.
-- ---------------------------------------------------------------------
select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      and exists (select 1 from information_schema.role_table_grants g
                   where g.table_schema = 'public'
                     and g.table_name = c.relname
                     and g.grantee in ('anon', 'authenticated'))),
  '',
  'Ninguna tabla sin policies tiene grants para anon/authenticated');

-- ---------------------------------------------------------------------
-- 3. Ninguna policy PERMISSIVE aplica a PUBLIC.
--    ESTE es el assert que habria atrapado el hallazgo A: sin clausula TO, una
--    policy permisiva aplica a PUBLIC — anon incluido — por mas que se llame
--    "service role full access".
--    Se excluyen los denies explicitos (qual = 'false'), que son seguros a
--    proposito: deny_all_login_attempts.
-- ---------------------------------------------------------------------
select is(
  (select coalesce(string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname), '')
     from pg_policies
    where schemaname = 'public'
      and permissive = 'PERMISSIVE'
      and roles = '{public}'
      and coalesce(qual, '') <> 'false'),
  '',
  'Ninguna policy permisiva sin clausula TO (aplicaria a anon)');

-- ---------------------------------------------------------------------
-- 4. anon no tiene ningun privilegio sobre tablas de public.
--    La app siempre autentica; el login va por GoTrue, no por PostgREST.
-- ---------------------------------------------------------------------
select is(
  (select coalesce(string_agg(distinct table_name, ', ' order by table_name), '')
     from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  '',
  'anon: cero privilegios sobre tablas de public');

-- ---------------------------------------------------------------------
-- 5. Nadie tiene TRUNCATE. RLS NO se aplica a TRUNCATE — no hay policy que
--    valga, solo el privilegio.
-- ---------------------------------------------------------------------
select is(
  (select coalesce(string_agg(distinct table_name || ':' || grantee, ', ' order by table_name || ':' || grantee), '')
     from information_schema.role_table_grants
    where table_schema = 'public'
      and privilege_type = 'TRUNCATE'
      and grantee in ('anon', 'authenticated')),
  '',
  'anon/authenticated no tienen TRUNCATE en ninguna tabla');

-- ---------------------------------------------------------------------
-- 6. Los default privileges no vuelven a abrir las tablas FUTURAS a anon.
--    Esta es la causa raiz del hallazgo A: con ALTER DEFAULT PRIVILEGES ...
--    GRANT ALL ON TABLES TO anon, cada CREATE TABLE nace abierta y solo la salva
--    que alguien se acuerde de escribir una policy.
--
--    Se acota a defaclrole = postgres a proposito: las migraciones se aplican
--    como `postgres` (asi conecta `supabase db push`), asi que ese es el default
--    ACL que gobierna las tablas que creamos nosotros. Queda otro default ACL
--    sobre public a nombre de `supabase_admin`, que no podemos ni debemos tocar:
--    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin exige ser miembro de ese
--    rol, y en Supabase hosted `postgres` no lo es — la migracion pasaria en
--    local y fallaria en el push a prod.
-- ---------------------------------------------------------------------
select is(
  (select count(*)::int
     from pg_default_acl d
     join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'public'
      and d.defaclobjtype = 'r'
      and d.defaclrole = 'postgres'::regrole
      and array_to_string(d.defaclacl, ',') like '%anon=%'),
  0,
  'ALTER DEFAULT PRIVILEGES (rol postgres) no otorga las tablas nuevas a anon');

-- ---------------------------------------------------------------------
-- 7. Toda policy de UPDATE declara WITH CHECK explicito.
--    El WITH CHECK implicito (= la expresion de USING) es el detalle que dejo
--    pasar el hallazgo B: users_update_own filtraba por `id = auth.uid()`, que
--    como WITH CHECK no impide cambiarse el role ni el org_id.
-- ---------------------------------------------------------------------
select is(
  (select coalesce(string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname), '')
     from pg_policies
    where schemaname = 'public' and cmd = 'UPDATE' and with_check is null),
  '',
  'Toda policy de UPDATE declara WITH CHECK explicito');

select * from finish();
rollback;
