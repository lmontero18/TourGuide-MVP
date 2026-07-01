-- supabase/tests/rls_isolation_test.sql
-- =====================================================================
-- Test de AISLAMIENTO RLS (multi-tenant): un usuario de la org P no puede
-- leer ni escribir datos de la org Q. Se corre con: `supabase test db` (pgTAP).
-- =====================================================================
-- Estrategia: fixtures propias (2 orgs con uuids únicos, no dependen del seed).
-- Para "simular" a un usuario se usa: set role authenticated + el claim
-- request.jwt.claims.sub = id del usuario (que es lo que lee auth.uid()).
-- Los conteos que ve cada usuario se capturan en GUCs (set_config) mientras
-- está impersonado, y las aserciones pgTAP se ejecutan como postgres. Así el
-- test no depende de que pgTAP sea invocable bajo el rol authenticated.
-- =====================================================================

begin;
select plan(15);

-- ---------- IDs de prueba ----------
--   Org P: a0000000-...-0001   Org Q: b0000000-...-0002
--   User P (admin): a0000000-...-00a1   User Q (admin): b0000000-...-00b1

-- ============ Fixtures (como postgres, bypassa RLS) ============
insert into public.organizations (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'Org P (test)', 'org-p-rls-test'),
  ('b0000000-0000-4000-8000-000000000002', 'Org Q (test)', 'org-q-rls-test');

-- Usuarios: insert en auth.users (mínimo) -> el trigger crea public.users.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'p-admin@rls.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"admin","org_id":"a0000000-0000-4000-8000-000000000001"}'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'q-admin@rls.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"role":"admin","org_id":"b0000000-0000-4000-8000-000000000002"}');

-- Contactos: P tiene 2, Q tiene 1
insert into public.contacts (id, org_id, phone, name) values
  ('a0000000-0000-4000-8000-00000000c001', 'a0000000-0000-4000-8000-000000000001', '+100000001', 'P uno'),
  ('a0000000-0000-4000-8000-00000000c002', 'a0000000-0000-4000-8000-000000000001', '+100000002', 'P dos'),
  ('b0000000-0000-4000-8000-00000000c001', 'b0000000-0000-4000-8000-000000000002', '+200000001', 'Q uno');

-- Conversaciones: 1 por org
insert into public.conversations (id, org_id, contact_id) values
  ('a0000000-0000-4000-8000-00000000d001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000c001'),
  ('b0000000-0000-4000-8000-00000000d001', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000c001');

-- Mensajes: P tiene 2, Q tiene 1
insert into public.messages (conversation_id, role, content) values
  ('a0000000-0000-4000-8000-00000000d001', 'user', 'hola P'),
  ('a0000000-0000-4000-8000-00000000d001', 'assistant', 'hola de vuelta P'),
  ('b0000000-0000-4000-8000-00000000d001', 'user', 'hola Q');

-- Leads: 1 por org
insert into public.leads (org_id, contact_id, conversation_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000c001', 'a0000000-0000-4000-8000-00000000d001'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000c001', 'b0000000-0000-4000-8000-00000000d001');

-- Subscriptions: 1 por org
insert into public.subscriptions (org_id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002');

-- WhatsApp accounts: 1 por org
insert into public.whatsapp_accounts (org_id, waba_id, phone_number_id, phone_number, access_token) values
  ('a0000000-0000-4000-8000-000000000001', 'waba-p', 'pnid-p', '+100000000', 'tok-p'),
  ('b0000000-0000-4000-8000-000000000002', 'waba-q', 'pnid-q', '+200000000', 'tok-q');

-- ============ Captura de lo que ve la ORG P ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select set_config('t.p_orgs',     (select count(*) from public.organizations)::text, true);
select set_config('t.p_contacts', (select count(*) from public.contacts)::text, true);
select set_config('t.p_convs',    (select count(*) from public.conversations)::text, true);
select set_config('t.p_msgs',     (select count(*) from public.messages)::text, true);
select set_config('t.p_leads',    (select count(*) from public.leads)::text, true);
select set_config('t.p_subs',     (select count(*) from public.subscriptions)::text, true);
select set_config('t.p_wa',       (select count(*) from public.whatsapp_accounts)::text, true);
-- Intento de escritura cruzada: P intenta crear un contacto en la org de Q -> debe fallar
do $$
begin
  insert into public.contacts (org_id, phone) values ('b0000000-0000-4000-8000-000000000002', '+199999999');
  perform set_config('t.p_write_blocked', 'no', true);
exception when others then
  perform set_config('t.p_write_blocked', 'yes', true);
end $$;
reset role;

-- ============ Captura de lo que ve la ORG Q ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select set_config('t.q_orgs',     (select count(*) from public.organizations)::text, true);
select set_config('t.q_contacts', (select count(*) from public.contacts)::text, true);
select set_config('t.q_convs',    (select count(*) from public.conversations)::text, true);
select set_config('t.q_msgs',     (select count(*) from public.messages)::text, true);
select set_config('t.q_leads',    (select count(*) from public.leads)::text, true);
select set_config('t.q_subs',     (select count(*) from public.subscriptions)::text, true);
select set_config('t.q_wa',       (select count(*) from public.whatsapp_accounts)::text, true);
reset role;

-- ============ Aserciones (como postgres) ============
-- Org P ve SOLO lo suyo
select is( current_setting('t.p_orgs')::int,     1, 'Org P: ve solo su organizacion');
select is( current_setting('t.p_contacts')::int, 2, 'Org P: ve solo sus 2 contactos');
select is( current_setting('t.p_convs')::int,    1, 'Org P: ve solo su conversacion');
select is( current_setting('t.p_msgs')::int,     2, 'Org P: ve solo sus 2 mensajes');
select is( current_setting('t.p_leads')::int,    1, 'Org P: ve solo su lead');
select is( current_setting('t.p_subs')::int,     1, 'Org P: ve solo su subscription');
select is( current_setting('t.p_wa')::int,       1, 'Org P: ve solo su cuenta de WhatsApp');
select is( current_setting('t.p_write_blocked'), 'yes', 'Org P: NO puede insertar en la org de Q (RLS WITH CHECK)');

-- Org Q ve SOLO lo suyo
select is( current_setting('t.q_orgs')::int,     1, 'Org Q: ve solo su organizacion');
select is( current_setting('t.q_contacts')::int, 1, 'Org Q: ve solo su contacto');
select is( current_setting('t.q_convs')::int,    1, 'Org Q: ve solo su conversacion');
select is( current_setting('t.q_msgs')::int,     1, 'Org Q: ve solo su mensaje');
select is( current_setting('t.q_leads')::int,    1, 'Org Q: ve solo su lead');
select is( current_setting('t.q_subs')::int,     1, 'Org Q: ve solo su subscription');
select is( current_setting('t.q_wa')::int,       1, 'Org Q: ve solo su cuenta de WhatsApp');

select * from finish();
rollback;
