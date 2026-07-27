-- CODE-151 (M8) · Cierre de pendientes de seguridad — lockdown de RLS y grants.
--
-- El baseline 20260622035843_remote_schema.sql es un dump de `supabase db dump`
-- ya aplicado en staging y prod. NO se edita: `supabase db push` no re-ejecuta un
-- archivo ya registrado en supabase_migrations.schema_migrations, asi que editarlo
-- dejaria la DB local segura y prod agujereada, con el CI en verde. Todo va aca,
-- forward, con DROP/CREATE. Misma convencion que 20260706030500.
--
-- Tres agujeros explotables + una falla funcional silenciosa. Ver el detalle en
-- cada seccion.


-- =====================================================================
-- A · embeddings estaba abierta a anon  [CRITICO]
--
-- La policy "service role full access" (baseline :856) no tenia clausula TO, asi
-- que aplicaba a PUBLIC — anon y authenticated incluidos. El nombre miente.
-- Sumado al GRANT ALL ... TO anon (:1967), cualquiera con la anon key (que viaja
-- en el bundle del browser) podia hacer
--
--     GET    /rest/v1/embeddings   -> knowledge base de TODOS los tenants
--     POST   /rest/v1/embeddings   -> envenenar el RAG
--     DELETE /rest/v1/embeddings   -> borrarlo entero
--
-- service_role tiene BYPASSRLS: no necesita policy. RLS activo + cero policies
-- = deny total para cualquier otro rol. El unico consumidor legitimo es n8n
-- (nodo "Supabase Vector Store", n8n/workflows/*.json).
-- =====================================================================
drop policy if exists "service role full access" on public.embeddings;

revoke all on table    public.embeddings        from anon, authenticated;
revoke all on sequence public.embeddings_id_seq from anon, authenticated;

-- match_documents es SECURITY INVOKER (baseline :172): corre con los privilegios
-- de quien la llama, asi que el revoke de la tabla de arriba ya la cierra —
-- anon recibe "permission denied for table embeddings" desde adentro de la
-- funcion.
--
-- NO se revoca el EXECUTE de la funcion, aunque seria la defensa en profundidad
-- obvia. En supabase/postgres:17.6.1.104 (PG 17.6), invocar una funcion con el
-- EXECUTE revocado desde un rol no-superusuario SEGFAULTEA el backend:
--
--   LOG: server process (PID N) was terminated by signal 11: Segmentation fault
--
-- Reproducible con una funcion trivial (`create function zz() returns int
-- language sql as 'select 42'` + revoke + `set role anon`), y tambien contra el
-- schema de main sin esta migracion — o sea es un bug del build de Postgres, no
-- de este cambio. Pero hoy ninguna funcion tiene el EXECUTE revocado, asi que el
-- camino al crash no existe; agregarlo le daria a anon un DoS de un request
-- contra /rest/v1/rpc/<funcion>. Se cierra por tabla, que es lo que importa.
-- Ver el ticket de seguimiento.

comment on table public.embeddings is
  'Knowledge base del RAG. Acceso EXCLUSIVO service_role (n8n). Sin org_id todavia: '
  'el aislamiento por tenant se resuelve en un ticket aparte — hoy match_documents '
  'busca sobre los documentos de todas las orgs.';


-- =====================================================================
-- B · escalada de privilegios y salto de tenant en users  [CRITICO]
--
-- users_update_own (baseline :874) no declaraba WITH CHECK. Postgres usa la
-- expresion de USING como WITH CHECK implicito, asi que `id` no se podia cambiar
-- — pero `role` y `org_id` SI:
--
--     PATCH /rest/v1/users?id=eq.<self>  {"role":"admin"}     -> agent se hace admin
--     PATCH /rest/v1/users?id=eq.<self>  {"org_id":"<otra>"}  -> salto de tenant
--
-- El segundo es el grave: todas las policies del schema resuelven la org con
-- get_user_org_id(), que lee esta misma columna. Un agente invitado se mudaba a
-- la org de otro cliente y veia todo.
-- =====================================================================
drop policy if exists users_update_own on public.users;

create policy users_update_own on public.users
  for update to authenticated
  using      (id = auth.uid())
  with check (id = auth.uid());

-- Defensa que no depende de la semantica de WITH CHECK: privilegio por columna.
-- role/org_id/email/id solo los escriben el service_role (app/api/onboarding/route.ts:118,
-- app/api/agents/invite/route.ts) y el trigger handle_new_user (SECURITY DEFINER).
revoke update             on public.users from authenticated;
grant  update (full_name) on public.users to   authenticated;


-- =====================================================================
-- B bis · organizations: self-upgrade de plan
--
-- org_update_admin_only (baseline :847) deja a un admin cambiar CUALQUIER columna
-- de su propia org, incluidos `plan` y `status`. Con Stripe (M7) eso es un upgrade
-- gratis via PATCH /rest/v1/organizations.
--
-- El unico write con cliente de usuario es app/api/organizations/route.ts:144-168,
-- que toca exactamente: name, faqs, tours, business_info, bot_config, prompt.
-- plan/status/onboarded_at van por serviceClient (app/api/onboarding/route.ts:200).
-- =====================================================================
drop policy if exists org_update_admin_only on public.organizations;

create policy org_update_admin_only on public.organizations
  for update to authenticated
  using      (id = public.auth_org_id() and public.auth_role() = 'admin')
  with check (id = public.auth_org_id() and public.auth_role() = 'admin');

revoke update on public.organizations from authenticated;
grant  update (name, prompt, faqs, tours, business_info, bot_config)
  on public.organizations to authenticated;
-- updated_at no necesita grant: lo escribe el trigger set_updated_at sobre NEW, y
-- el chequeo de privilegio por columna solo mira las columnas del statement.


-- =====================================================================
-- Resto de policies: clausula TO explicita + WITH CHECK explicito.
--
-- Ninguna de estas era explotable: su USING es `org_id = get_user_org_id()`, que
-- como WITH CHECK implicito ya impedia mover una fila a otra org, y para anon
-- get_user_org_id() devuelve NULL (cero filas). Se recrean igual porque:
--
--   1. sin TO, una policy permisiva aplica a PUBLIC — que es literalmente el bug
--      de embeddings. Con todas explicitas, el guard test puede exigirlo y frenar
--      la proxima.
--   2. el WITH CHECK implicito es un detalle poco conocido; explicito se lee.
-- =====================================================================

-- contacts
drop policy if exists contacts_select_own_org on public.contacts;
drop policy if exists contacts_insert_own_org on public.contacts;
drop policy if exists contacts_update_own_org on public.contacts;
create policy contacts_select_own_org on public.contacts
  for select to authenticated using (org_id = public.get_user_org_id());
create policy contacts_insert_own_org on public.contacts
  for insert to authenticated with check (org_id = public.get_user_org_id());
create policy contacts_update_own_org on public.contacts
  for update to authenticated
  using      (org_id = public.get_user_org_id())
  with check (org_id = public.get_user_org_id());

-- conversations
drop policy if exists conversations_select_own_org on public.conversations;
drop policy if exists conversations_insert_own_org on public.conversations;
drop policy if exists conversations_update_own_org on public.conversations;
create policy conversations_select_own_org on public.conversations
  for select to authenticated using (org_id = public.get_user_org_id());
create policy conversations_insert_own_org on public.conversations
  for insert to authenticated with check (org_id = public.get_user_org_id());
create policy conversations_update_own_org on public.conversations
  for update to authenticated
  using      (org_id = public.get_user_org_id())
  with check (org_id = public.get_user_org_id());

-- leads
drop policy if exists leads_select_own_org on public.leads;
drop policy if exists leads_insert_own_org on public.leads;
drop policy if exists leads_update_own_org on public.leads;
create policy leads_select_own_org on public.leads
  for select to authenticated using (org_id = public.get_user_org_id());
create policy leads_insert_own_org on public.leads
  for insert to authenticated with check (org_id = public.get_user_org_id());
create policy leads_update_own_org on public.leads
  for update to authenticated
  using      (org_id = public.get_user_org_id())
  with check (org_id = public.get_user_org_id());

-- messages (tenancy indirecta via conversation_id)
drop policy if exists messages_select_own_org on public.messages;
drop policy if exists messages_insert_own_org on public.messages;
create policy messages_select_own_org on public.messages
  for select to authenticated
  using (conversation_id in (
    select id from public.conversations where org_id = public.get_user_org_id()));
create policy messages_insert_own_org on public.messages
  for insert to authenticated
  with check (conversation_id in (
    select id from public.conversations where org_id = public.get_user_org_id()));

-- organizations / subscriptions / users (SELECT)
drop policy if exists org_select_own on public.organizations;
create policy org_select_own on public.organizations
  for select to authenticated using (id = public.get_user_org_id());

drop policy if exists subscription_select_own on public.subscriptions;
create policy subscription_select_own on public.subscriptions
  for select to authenticated using (org_id = public.get_user_org_id());

drop policy if exists users_select_own_or_org on public.users;
create policy users_select_own_or_org on public.users
  for select to authenticated
  using (id = auth.uid() or org_id = public.get_user_org_id());

-- whatsapp_accounts
drop policy if exists whatsapp_select_own   on public.whatsapp_accounts;
drop policy if exists whatsapp_insert_admin on public.whatsapp_accounts;
drop policy if exists whatsapp_update_admin on public.whatsapp_accounts;
create policy whatsapp_select_own on public.whatsapp_accounts
  for select to authenticated using (org_id = public.get_user_org_id());
create policy whatsapp_insert_admin on public.whatsapp_accounts
  for insert to authenticated
  with check (org_id = public.auth_org_id() and public.auth_role() = 'admin');
create policy whatsapp_update_admin on public.whatsapp_accounts
  for update to authenticated
  using      (org_id = public.auth_org_id() and public.auth_role() = 'admin')
  with check (org_id = public.auth_org_id() and public.auth_role() = 'admin');


-- =====================================================================
-- G · whatsapp_accounts no tenia policy de DELETE  [falla silenciosa en prod]
--
-- app/api/whatsapp/disconnect/route.ts:53 borra con el cliente del usuario
-- (rol authenticated). Sin policy de DELETE, RLS filtra el statement a 0 filas,
-- PostgREST devuelve 204 sin error y la ruta responde {success:true}.
-- El numero NUNCA se desconectaba y el usuario creia que si.
-- =====================================================================
create policy whatsapp_delete_admin on public.whatsapp_accounts
  for delete to authenticated
  using (org_id = public.auth_org_id() and public.auth_role() = 'admin');


-- =====================================================================
-- D · grants
--
-- El baseline hace GRANT ALL ON TABLE ... TO anon en las 10 tablas de public
-- (:1955-2020) y ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon
-- (:2047). Eso ultimo es la causa raiz: cada tabla nueva nace abierta a anon, y
-- solo la salva que alguien se acuerde de escribir una policy. Asi nacio A.
--
-- anon no tiene ningun uso legitimo sobre public: la app siempre autentica, el
-- login va por GoTrue (no PostgREST) y login_attempts se escribe con service
-- client (app/(auth)/login/actions.ts).
--
-- No se tocan los grants de FUNCIONES existentes, por dos motivos:
--   1. pgvector esta instalado en public y el baseline tiene ~200 GRANT sobre
--      public.vector_*/halfvec_* (:925-1330): un revoke masivo rompe cosas de
--      forma no obvia.
--   2. revocar EXECUTE segfaultea el backend en este build de Postgres al
--      invocar la funcion como anon (ver la nota larga en la seccion A).
-- get_user_org_id() como anon devuelve NULL (auth.uid() es NULL): inocua.
-- Lo que si aplica es el default privilege, que solo afecta funciones FUTURAS.
-- =====================================================================
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- authenticated: enfoque quirurgico. RLS ya lo aisla por org en cada tabla, asi
-- que el DML se deja como esta (los grants por columna de users/organizations, mas
-- arriba, cubren lo explotable). Lo que si se saca es lo que RLS NO cubre:
-- RLS no aplica a TRUNCATE. REFERENCES/TRIGGER tampoco tienen uso desde PostgREST.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- login_attempts: solo service_role. Ya tenia deny_all (baseline :803), pero el
-- grant seguia ahi.
revoke all on table public.login_attempts from anon, authenticated;
comment on table public.login_attempts is
  'Rate limiting de login/signup. Acceso EXCLUSIVO service_role — '
  'app/(auth)/login/actions.ts usa createServiceClient().';
