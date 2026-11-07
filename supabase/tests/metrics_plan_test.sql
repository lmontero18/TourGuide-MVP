-- supabase/tests/metrics_plan_test.sql
-- =====================================================================
-- CODE-204: metricas por plan, chequeadas en la DB (no solo en la pantalla).
--   Starter con el flag `plans`: get_business_metrics() rechaza y
--   get_team_metrics() no trae ventas ni leads por persona.
--   Pro: las dos traen todo.
-- =====================================================================

begin;
select plan(5);

insert into public.organizations (id, name, slug, plan, is_beta, features) values
  ('f0000000-0000-4000-8000-000000000008', 'Org MS (test)', 'org-ms-metrics-test', 'starter', false, '{plans}'),
  ('f0000000-0000-4000-8000-000000000009', 'Org MP (test)', 'org-mp-metrics-test', 'pro',     false, '{plans}');

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-0000000000f8', 'authenticated', 'authenticated', 'ms@metrics.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-0000000000f9', 'authenticated', 'authenticated', 'mp@metrics.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

update public.users set role = 'admin', org_id = 'f0000000-0000-4000-8000-000000000008' where id = 'f0000000-0000-4000-8000-0000000000f8';
update public.users set role = 'admin', org_id = 'f0000000-0000-4000-8000-000000000009' where id = 'f0000000-0000-4000-8000-0000000000f9';

-- ---------- Starter ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-0000000000f8","role":"authenticated"}', true);
do $$ begin
  perform public.get_business_metrics(now() - interval '7 days', now());
  perform set_config('t.s_business', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.s_business', 'blocked', true);
end $$;
select set_config('t.s_team', public.get_team_metrics(now() - interval '7 days', now())::text, true);
reset role;

-- ---------- Pro ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-0000000000f9","role":"authenticated"}', true);
do $$ begin
  perform public.get_business_metrics(now() - interval '7 days', now());
  perform set_config('t.p_business', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.p_business', 'blocked', true);
end $$;
select set_config('t.p_team', public.get_team_metrics(now() - interval '7 days', now())::text, true);
reset role;

select is(current_setting('t.s_business'), 'blocked', 'Starter: get_business_metrics() rechaza');
select ok(not (current_setting('t.s_team')::jsonb->'team' ? 'sales'), 'Starter: Equipo sin ventas del equipo');
select ok(not (current_setting('t.s_team')::jsonb->'members'->0 ? 'leads'), 'Starter: Equipo sin leads por persona');
select is(current_setting('t.p_business'), 'allowed', 'Pro: get_business_metrics() responde');
select ok(current_setting('t.p_team')::jsonb->'members'->0 ? 'sales', 'Pro: Equipo con ventas por persona');

select * from finish();
rollback;
