-- supabase/tests/knowledge_admin_only_test.sql
-- =====================================================================
-- CODE-200: solo el admin edita Tours y preguntas. Un agente de la misma org
-- no pasa can_edit_knowledge() y las funciones que escriben (save_pickups,
-- touch_knowledge) lo rechazan aunque las llame directo, sin pasar por la API.
-- Mismo metodo que rls_isolation_test.sql: se impersona con set role +
-- request.jwt.claims y se guardan los resultados en GUCs.
-- =====================================================================

begin;
select plan(5);

insert into public.organizations (id, name, slug) values
  ('c0000000-0000-4000-8000-000000000003', 'Org K (test)', 'org-k-knowledge-test');

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'k-admin@knowledge.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'k-agent@knowledge.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

update public.users set role = 'admin', org_id = 'c0000000-0000-4000-8000-000000000003'
 where id = 'c0000000-0000-4000-8000-0000000000c1';
update public.users set role = 'agent', org_id = 'c0000000-0000-4000-8000-000000000003'
 where id = 'c0000000-0000-4000-8000-0000000000c2';

-- ---------- Agente ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select set_config('t.agent_can', public.can_edit_knowledge()::text, true);

do $$
begin
  perform public.save_pickups('[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
  perform set_config('t.agent_pickups', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.agent_pickups', 'blocked', true);
end $$;

do $$
begin
  perform public.touch_knowledge(array['tours']);
  perform set_config('t.agent_touch', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.agent_touch', 'blocked', true);
end $$;
reset role;

-- ---------- Admin ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select set_config('t.admin_can', public.can_edit_knowledge()::text, true);

do $$
begin
  perform public.save_pickups('[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
  perform set_config('t.admin_pickups', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.admin_pickups', 'blocked', true);
end $$;
reset role;

select is(current_setting('t.agent_can'), 'false', 'Agente: can_edit_knowledge() es false');
select is(current_setting('t.agent_pickups'), 'blocked', 'Agente: save_pickups() lo rechaza');
select is(current_setting('t.agent_touch'), 'blocked', 'Agente: touch_knowledge() lo rechaza');
select is(current_setting('t.admin_can'), 'true', 'Admin: can_edit_knowledge() es true');
select is(current_setting('t.admin_pickups'), 'allowed', 'Admin: save_pickups() guarda');

select * from finish();
rollback;
