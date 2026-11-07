-- supabase/tests/pickups_bookings_plan_test.sql
-- =====================================================================
-- CODE-205: Recogidas y Reservas son Pro, chequeado en la DB.
--   Starter con el flag `plans`: save_pickups() rechaza y no puede crear
--   reservas (ni por PostgREST directo). Pro: las dos cosas funcionan.
--   Las recogidas ya cargadas de una org Starter no se borran.
-- =====================================================================

begin;
select plan(5);

insert into public.organizations (id, name, slug, plan, is_beta, features) values
  ('a1000000-0000-4000-8000-00000000000a', 'Org RS (test)', 'org-rs-pickups-test', 'starter', false, '{plans}'),
  ('a1000000-0000-4000-8000-00000000000b', 'Org RP (test)', 'org-rp-pickups-test', 'pro',     false, '{plans}');

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-0000000000aa', 'authenticated', 'authenticated', 'rs@pickups.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-0000000000ab', 'authenticated', 'authenticated', 'rp@pickups.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

update public.users set role = 'admin', org_id = 'a1000000-0000-4000-8000-00000000000a' where id = 'a1000000-0000-4000-8000-0000000000aa';
update public.users set role = 'admin', org_id = 'a1000000-0000-4000-8000-00000000000b' where id = 'a1000000-0000-4000-8000-0000000000ab';

insert into public.contacts (id, org_id, phone) values
  ('a1000000-0000-4000-8000-0000000c000a', 'a1000000-0000-4000-8000-00000000000a', '+510000010'),
  ('a1000000-0000-4000-8000-0000000c000b', 'a1000000-0000-4000-8000-00000000000b', '+510000011');
insert into public.leads (id, org_id, contact_id) values
  ('a1000000-0000-4000-8000-0000000e000a', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-0000000c000a'),
  ('a1000000-0000-4000-8000-0000000e000b', 'a1000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-0000000c000b');

-- Recogidas que la org Starter cargo cuando era Pro.
insert into public.pickup_zones (id, org_id, name, sort) values
  ('a1000000-0000-4000-8000-0000000f000a', 'a1000000-0000-4000-8000-00000000000a', 'Centro', 0);

-- ---------- Starter ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000aa","role":"authenticated"}', true);
do $$ begin
  perform public.save_pickups('[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
  perform set_config('t.s_pickups', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.s_pickups', 'blocked', true);
end $$;
do $$ begin
  insert into public.bookings (org_id, lead_id, tour_name, date)
  values ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-0000000e000a', 'Volcan', current_date);
  perform set_config('t.s_booking', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.s_booking', 'blocked', true);
end $$;
reset role;

-- ---------- Pro ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000ab","role":"authenticated"}', true);
do $$ begin
  perform public.save_pickups('[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
  perform set_config('t.p_pickups', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.p_pickups', 'blocked', true);
end $$;
do $$ begin
  insert into public.bookings (org_id, lead_id, tour_name, date)
  values ('a1000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-0000000e000b', 'Volcan', current_date);
  perform set_config('t.p_booking', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.p_booking', 'blocked', true);
end $$;
reset role;

select is(current_setting('t.s_pickups'), 'blocked', 'Starter: save_pickups() rechaza');
select is(current_setting('t.s_booking'), 'blocked', 'Starter: no crea reservas');
select is((select count(*)::int from public.pickup_zones where org_id = 'a1000000-0000-4000-8000-00000000000a'), 1, 'Starter: sus recogidas cargadas siguen ahi');
select is(current_setting('t.p_pickups'), 'allowed', 'Pro: save_pickups() guarda');
select is(current_setting('t.p_booking'), 'allowed', 'Pro: crea reservas');

select * from finish();
rollback;
