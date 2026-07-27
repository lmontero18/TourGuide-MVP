-- supabase/tests/anon_and_privesc_test.sql
-- =====================================================================
-- Test de superficie ANON y de ESCALADA DE PRIVILEGIOS (CODE-151 / M8).
--
-- rls_isolation_test.sql cubre el aislamiento entre dos orgs AUTENTICADAS.
-- Este archivo cubre lo que faltaba y que dejo pasar tres agujeros:
--
--   1. el rol `anon` — la key que viaja en el bundle del browser. Nunca se
--      ejercitaba, y por eso `embeddings` estuvo abierta a lectura/escritura
--      publica sin que ningun test lo notara.
--   2. los UPDATE. Ninguna policy de UPDATE se testeaba, y users_update_own
--      no tenia WITH CHECK: un agent podia hacerse admin o mudarse de org_id.
--
-- Patron (mismo que rls_isolation_test.sql): impersonar con `set local role` +
-- request.jwt.claims, capturar el resultado en un GUC, assertear despues como
-- postgres. Cada operacion va en su propio DO ... EXCEPTION porque un
-- "permission denied" (SQLSTATE 42501) aborta la transaccion; el rollback de
-- subtransaccion del DO la deja usable para el resto del test.
-- =====================================================================

begin;
select plan(24);

-- ---------- IDs de prueba ----------
--   Org R: c0000000-...-0001      Org S: c0000000-...-0002
--   User R (agent): c0000000-...-00a1

-- ============ Fixtures (como postgres, bypassa RLS) ============
insert into public.organizations (id, name, slug) values
  ('c0000000-0000-4000-8000-000000000001', 'Org R (anon test)', 'org-r-anon-test'),
  ('c0000000-0000-4000-8000-000000000002', 'Org S (anon test)', 'org-s-anon-test');

-- User R: rol `agent` (privilegio minimo) en la org R — el que intenta escalar.
-- User S: rol `admin` en la org S — el que tiene que poder conectar WhatsApp.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'r-agent@rls.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"agent","org_id":"c0000000-0000-4000-8000-000000000001"}'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 's-admin@rls.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"admin","org_id":"c0000000-0000-4000-8000-000000000002"}');
-- Los usuarios se crean en dos pasos a proposito. handle_new_user() ya NO lee
-- role/org_id de raw_user_meta_data (era una via de escalada: un signup directo
-- contra GoTrue daba admin de cualquier org — ver
-- 20260727140000_handle_new_user_no_privesc.sql). El trigger crea la fila con
-- role='admin' y org_id=null; la asignacion real la hace el service client, que
-- es lo que replica este update.

update public.users set role = 'agent', org_id = 'c0000000-0000-4000-8000-000000000001'
 where id = 'c0000000-0000-4000-8000-0000000000a1';
update public.users set role = 'admin', org_id = 'c0000000-0000-4000-8000-000000000002'
 where id = 'c0000000-0000-4000-8000-0000000000b1';

insert into public.contacts (org_id, phone, name) values
  ('c0000000-0000-4000-8000-000000000001', '+300000001', 'R uno');

insert into public.whatsapp_accounts (org_id, waba_id, phone_number_id, phone_number) values
  ('c0000000-0000-4000-8000-000000000001', 'waba-r', 'pnid-r', '+300000000');

-- El documento que anon NO tiene que poder leer ni borrar.
insert into public.embeddings (content, metadata) values
  ('documento privado de la org R', '{"org_id":"c0000000-0000-4000-8000-000000000001"}');

-- ============ Bloque ANON ============
-- Sin JWT: es exactamente lo que hace un `curl` con la anon key pelada.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ begin
  perform count(*) from public.embeddings;
  perform set_config('t.anon_emb_select', 'allowed', true);
exception when others then
  perform set_config('t.anon_emb_select', 'blocked', true);
end $$;

do $$ begin
  insert into public.embeddings (content) values ('poison');
  perform set_config('t.anon_emb_insert', 'allowed', true);
exception when others then
  perform set_config('t.anon_emb_insert', 'blocked', true);
end $$;

do $$ begin
  delete from public.embeddings;
  perform set_config('t.anon_emb_delete', 'allowed', true);
exception when others then
  perform set_config('t.anon_emb_delete', 'blocked', true);
end $$;

-- match_documents es la puerta de atras a embeddings: es SECURITY INVOKER, asi
-- que el bloqueo tiene que venir del revoke de la TABLA, no del EXECUTE de la
-- funcion. El EXECUTE se deja otorgado a proposito — revocarlo segfaultea el
-- backend en supabase/postgres:17.6.1.104 (ver la nota en la migracion
-- 20260727120000_rls_lockdown.sql). Este assert es justamente el que verifica
-- que cerrar solo por tabla alcanza.
do $$ declare n int; begin
  select count(*) into n from public.match_documents(
    array_fill(0::real, array[1536])::public.vector, 5, '{}'::jsonb);
  perform set_config('t.anon_match_docs', 'allowed', true);
exception when others then
  perform set_config('t.anon_match_docs', 'blocked', true);
end $$;

do $$ begin
  perform count(*) from public.contacts;
  perform set_config('t.anon_contacts', 'allowed', true);
exception when others then
  perform set_config('t.anon_contacts', 'blocked', true);
end $$;

do $$ begin
  perform count(*) from public.users;
  perform set_config('t.anon_users', 'allowed', true);
exception when others then
  perform set_config('t.anon_users', 'blocked', true);
end $$;

do $$ begin
  perform count(*) from public.whatsapp_accounts;
  perform set_config('t.anon_wa', 'allowed', true);
exception when others then
  perform set_config('t.anon_wa', 'blocked', true);
end $$;

do $$ begin
  perform count(*) from public.login_attempts;
  perform set_config('t.anon_login_attempts', 'allowed', true);
exception when others then
  perform set_config('t.anon_login_attempts', 'blocked', true);
end $$;

do $$ begin
  perform count(*) from public.organizations;
  perform set_config('t.anon_orgs', 'allowed', true);
exception when others then
  perform set_config('t.anon_orgs', 'blocked', true);
end $$;

reset role;

-- ============ Bloque ESCALADA (usuario `agent` autenticado) ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$ begin
  update public.users set role = 'admin'
   where id = 'c0000000-0000-4000-8000-0000000000a1';
  perform set_config('t.escala_role', 'allowed', true);
exception when others then
  perform set_config('t.escala_role', 'blocked', true);
end $$;

do $$ begin
  update public.users set org_id = 'c0000000-0000-4000-8000-000000000002'
   where id = 'c0000000-0000-4000-8000-0000000000a1';
  perform set_config('t.escala_org', 'allowed', true);
exception when others then
  perform set_config('t.escala_org', 'blocked', true);
end $$;

do $$ begin
  update public.organizations set plan = 'pro'
   where id = 'c0000000-0000-4000-8000-000000000001';
  perform set_config('t.escala_plan', 'allowed', true);
exception when others then
  perform set_config('t.escala_plan', 'blocked', true);
end $$;

do $$ begin
  perform count(*) from public.embeddings;
  perform set_config('t.auth_emb_select', 'allowed', true);
exception when others then
  perform set_config('t.auth_emb_select', 'blocked', true);
end $$;

-- El token ya no se puede escribir ni leer por PostgREST: los grants de
-- whatsapp_accounts pasaron de nivel tabla a nivel columna, salteando access_token.
do $$ begin
  update public.whatsapp_accounts set access_token = 'robado'
   where org_id = 'c0000000-0000-4000-8000-000000000001';
  perform set_config('t.wa_token_write', 'allowed', true);
exception when others then
  perform set_config('t.wa_token_write', 'blocked', true);
end $$;

do $$ declare v text; begin
  select access_token into v from public.whatsapp_accounts
   where org_id = 'c0000000-0000-4000-8000-000000000001';
  perform set_config('t.wa_token_read', 'allowed', true);
exception when others then
  perform set_config('t.wa_token_read', 'blocked', true);
end $$;

reset role;

-- ============ Bloque REGRESION: el admin sigue pudiendo conectar ============
-- Los grants por columna de whatsapp_accounts son finos y facilisimos de dejar
-- incompletos. /api/whatsapp/connect y connect-manual hacen upsert con el cliente
-- del USUARIO, asi que si falta una columna en el grant el connect se rompe en
-- prod y ningun otro test lo nota.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);

do $$ begin
  insert into public.whatsapp_accounts
    (org_id, waba_id, phone_number_id, phone_number, status, connected_at)
  values
    ('c0000000-0000-4000-8000-000000000002', 'waba-s', 'pnid-s', '+400000000', 'active', now())
  on conflict (org_id) do update set
    org_id       = excluded.org_id,
    waba_id      = excluded.waba_id,
    phone_number_id = excluded.phone_number_id,
    phone_number = excluded.phone_number,
    status       = excluded.status,
    connected_at = excluded.connected_at;
  perform set_config('t.admin_upsert_wa', 'allowed', true);
exception when others then
  perform set_config('t.admin_upsert_wa', 'blocked', true);
end $$;

reset role;

-- ============ Bloque SIGNUP: la via GoTrue ============
-- Un signup es un INSERT en auth.users con raw_user_meta_data 100% controlada por
-- quien se registra (POST /auth/v1/signup con la anon key, sin pasar por la app).
-- handle_new_user() es SECURITY DEFINER, asi que si confiara en esa metadata
-- crearia la fila en public.users con el rol y la org que el atacante pida —
-- sin tocar PostgREST, o sea sin que los grants por columna lo frenen.
--
-- El payload pide role='agent' a proposito, NO 'admin': el default del trigger ya
-- es 'admin', asi que un payload con 'admin' pasaria igual con el codigo viejo y
-- el assert no probaria nada. Pidiendo un valor DISTINTO del default, que la fila
-- termine en 'admin' demuestra que la metadata se ignoro de verdad.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'atacante@rls.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Atacante","role":"agent","org_id":"c0000000-0000-4000-8000-000000000002"}');

-- ============ Aserciones (como postgres) ============

-- El signup no se autoasigna org ni rol privilegiado
select is( (select org_id from public.users where id = 'c0000000-0000-4000-8000-0000000000c1'),
           null, 'signup: org_id de raw_user_meta_data IGNORADO (no hay toma de org ajena)');
select is( (select role::text from public.users where id = 'c0000000-0000-4000-8000-0000000000c1'),
           'admin', 'signup: role de raw_user_meta_data IGNORADO (queda el default, no el pedido)');
select is( (select full_name from public.users where id = 'c0000000-0000-4000-8000-0000000000c1'),
           'Atacante', 'signup: full_name si se toma de la metadata (no decide autorizacion)');

-- anon: cero superficie sobre public
select is( current_setting('t.anon_emb_select'),     'blocked', 'anon: NO puede leer embeddings (KB de todos los tenants)');
select is( current_setting('t.anon_emb_insert'),     'blocked', 'anon: NO puede insertar en embeddings (envenenar el RAG)');
select is( current_setting('t.anon_emb_delete'),     'blocked', 'anon: NO puede borrar embeddings');
select is( current_setting('t.anon_match_docs'),     'blocked', 'anon: match_documents() no le devuelve nada (bloqueo por tabla)');
select is( current_setting('t.anon_contacts'),       'blocked', 'anon: NO puede leer contacts');
select is( current_setting('t.anon_users'),          'blocked', 'anon: NO puede leer users');
select is( current_setting('t.anon_wa'),             'blocked', 'anon: NO puede leer whatsapp_accounts');
select is( current_setting('t.anon_login_attempts'), 'blocked', 'anon: NO puede leer login_attempts');
select is( current_setting('t.anon_orgs'),           'blocked', 'anon: NO puede leer organizations');

-- escalada de privilegios
select is( current_setting('t.escala_role'),     'blocked', 'agent: NO puede promoverse a admin');
select is( current_setting('t.escala_org'),      'blocked', 'agent: NO puede cambiarse de org_id (salto de tenant)');
select is( current_setting('t.escala_plan'),     'blocked', 'agent: NO puede cambiar el plan de su org');
select is( current_setting('t.auth_emb_select'), 'blocked', 'authenticated: NO puede leer embeddings');

-- access_token: sin grant de columna, ni lectura ni escritura por PostgREST
select is( current_setting('t.wa_token_write'), 'blocked', 'authenticated: NO puede escribir whatsapp_accounts.access_token');
select is( current_setting('t.wa_token_read'),  'blocked', 'authenticated: NO puede leer whatsapp_accounts.access_token');

-- Regresion: los grants por columna no rompieron el flujo de conectar WhatsApp
select is( current_setting('t.admin_upsert_wa'), 'allowed', 'admin: SI puede hacer upsert de su cuenta de WhatsApp (connect no se rompio)');

-- Estado real de la DB despues de los intentos.
-- NO es redundante con los asserts de arriba: un UPDATE bloqueado por RLS (a
-- diferencia de uno bloqueado por privilegio de columna) NO lanza excepcion —
-- afecta 0 filas en silencio. Con solo mirar 'blocked', un fix a medias pasaria.
select is( (select role::text from public.users where id = 'c0000000-0000-4000-8000-0000000000a1'),
           'agent', 'users.role sigue siendo agent');
select is( (select org_id from public.users where id = 'c0000000-0000-4000-8000-0000000000a1'),
           'c0000000-0000-4000-8000-000000000001'::uuid, 'users.org_id no cambio');
select is( (select plan::text from public.organizations where id = 'c0000000-0000-4000-8000-000000000001'),
           'starter', 'organizations.plan no cambio');
select is( (select count(*)::int from public.embeddings),
           1, 'embeddings intacta despues de los intentos de anon');

-- Superficie estatica, no solo comportamiento: el grant es lo que fallo en A.
select is( (select coalesce(string_agg(distinct table_name, ', ' order by table_name), '')
              from information_schema.role_table_grants
             where table_schema = 'public' and grantee = 'anon'),
           '', 'anon no tiene NINGUN privilegio sobre tablas de public');

select * from finish();
rollback;
