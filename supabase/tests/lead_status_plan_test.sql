-- supabase/tests/lead_status_plan_test.sql
-- =====================================================================
-- CODE-203: una agencia Starter (con el flag `plans`) no cambia el estado del
-- lead, ni llamando a PostgREST directo. Si puede corregir datos y el monto.
-- Pro y las orgs sin el flag cambian el estado igual que antes, y el service
-- role (bot, crons) tambien.
-- =====================================================================

begin;
select plan(6);

-- S: starter con flag · P: pro con flag · F: starter sin flag
insert into public.organizations (id, name, slug, plan, is_beta, features) values
  ('e0000000-0000-4000-8000-000000000005', 'Org S (test)', 'org-s-plan-test', 'starter', false, '{plans}'),
  ('e0000000-0000-4000-8000-000000000006', 'Org P (test)', 'org-p-plan-test', 'pro',     false, '{plans}'),
  ('e0000000-0000-4000-8000-000000000007', 'Org F (test)', 'org-f-plan-test', 'starter', false, '{}');

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', 's@plans.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-0000000000e6', 'authenticated', 'authenticated', 'p@plans.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-0000000000e7', 'authenticated', 'authenticated', 'f@plans.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

update public.users set role = 'agent', org_id = 'e0000000-0000-4000-8000-000000000005' where id = 'e0000000-0000-4000-8000-0000000000e5';
update public.users set role = 'agent', org_id = 'e0000000-0000-4000-8000-000000000006' where id = 'e0000000-0000-4000-8000-0000000000e6';
update public.users set role = 'agent', org_id = 'e0000000-0000-4000-8000-000000000007' where id = 'e0000000-0000-4000-8000-0000000000e7';

insert into public.contacts (id, org_id, phone) values
  ('e0000000-0000-4000-8000-00000000c005', 'e0000000-0000-4000-8000-000000000005', '+500000005'),
  ('e0000000-0000-4000-8000-00000000c006', 'e0000000-0000-4000-8000-000000000006', '+500000006'),
  ('e0000000-0000-4000-8000-00000000c007', 'e0000000-0000-4000-8000-000000000007', '+500000007');

insert into public.leads (id, org_id, contact_id, status) values
  ('e0000000-0000-4000-8000-0000000a0005', 'e0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-00000000c005', 'new'),
  ('e0000000-0000-4000-8000-0000000a0006', 'e0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-00000000c006', 'new'),
  ('e0000000-0000-4000-8000-0000000a0007', 'e0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-00000000c007', 'new');

-- ---------- Starter con flag ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-0000000000e5","role":"authenticated"}', true);
do $$ begin
  update public.leads set status = 'converted' where id = 'e0000000-0000-4000-8000-0000000a0005';
  perform set_config('t.s_status', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.s_status', 'blocked', true);
end $$;
do $$ begin
  update public.leads set amount = 250, currency = 'USD', tour_interest = 'Volcan' where id = 'e0000000-0000-4000-8000-0000000a0005';
  perform set_config('t.s_amount', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.s_amount', 'blocked', true);
end $$;
reset role;

-- ---------- Pro con flag ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-0000000000e6","role":"authenticated"}', true);
do $$ begin
  update public.leads set status = 'converted' where id = 'e0000000-0000-4000-8000-0000000a0006';
  perform set_config('t.p_status', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.p_status', 'blocked', true);
end $$;
reset role;

-- ---------- Starter sin flag ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-0000000000e7","role":"authenticated"}', true);
do $$ begin
  update public.leads set status = 'qualified' where id = 'e0000000-0000-4000-8000-0000000a0007';
  perform set_config('t.f_status', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.f_status', 'blocked', true);
end $$;
reset role;

-- ---------- Service role (sin sesion de usuario): el bot ----------
select set_config('request.jwt.claims', '', true);
update public.leads set status = 'qualified' where id = 'e0000000-0000-4000-8000-0000000a0005';

select is(current_setting('t.s_status'), 'blocked', 'Starter: NO cambia el estado del lead');
select is(current_setting('t.s_amount'), 'allowed', 'Starter: corrige datos y anota el monto');
select is((select amount::text from public.leads where id = 'e0000000-0000-4000-8000-0000000a0005'), '250.00', 'Starter: el monto queda guardado');
select is(current_setting('t.p_status'), 'allowed', 'Pro: cambia el estado');
select is(current_setting('t.f_status'), 'allowed', 'Sin el flag plans: cambia el estado como antes');
select is((select status::text from public.leads where id = 'e0000000-0000-4000-8000-0000000a0005'), 'qualified', 'El bot (service role) sigue moviendo el estado en Starter');

select * from finish();
rollback;
