-- supabase/tests/plans_test.sql
-- =====================================================================
-- CODE-201: el plan de cada agencia (organizations.plan).
--   - plan_type solo tiene 'starter' y 'pro'.
--   - Un ADMIN no puede cambiar el plan de su propia org (el de agente ya lo
--     prueba anon_and_privesc_test.sql). Solo SQL o el service role.
-- =====================================================================

begin;
select plan(4);

select is(
  (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
     from pg_enum e join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'plan_type'),
  'starter,pro',
  'plan_type: solo starter y pro');

insert into public.organizations (id, name, slug) values
  ('d0000000-0000-4000-8000-000000000004', 'Org Plan (test)', 'org-plan-test');

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'plan-admin@plans.test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

update public.users set role = 'admin', org_id = 'd0000000-0000-4000-8000-000000000004'
 where id = 'd0000000-0000-4000-8000-0000000000d1';

select is((select plan::text from public.organizations where id = 'd0000000-0000-4000-8000-000000000004'),
          'starter', 'Una org nueva arranca en starter');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  update public.organizations set plan = 'pro'
   where id = 'd0000000-0000-4000-8000-000000000004';
  perform set_config('t.admin_plan', 'allowed', true);
exception when insufficient_privilege then
  perform set_config('t.admin_plan', 'blocked', true);
end $$;
reset role;

select is(current_setting('t.admin_plan'), 'blocked', 'Admin: NO puede cambiar el plan de su org');
select is((select plan::text from public.organizations where id = 'd0000000-0000-4000-8000-000000000004'),
          'starter', 'organizations.plan no cambio');

select * from finish();
rollback;
