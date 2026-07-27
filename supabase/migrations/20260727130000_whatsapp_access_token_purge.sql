-- CODE-151 (M8) · Dejar de persistir el access_token de WhatsApp.
--
-- Modelo B (token central de System User en META_SYSTEM_USER_TOKEN) ya estaba
-- vigente: /api/whatsapp/connect inserta null desde 20260706030500. Lo que
-- faltaba era /api/whatsapp/connect-manual, que seguia guardando el token en
-- plaintext — y whatsapp_select_own no discrimina rol, asi que CUALQUIER miembro
-- de la org (agent incluido) podia leerlo con
--
--     GET /rest/v1/whatsapp_accounts?select=access_token
--
-- Este paso solo NULEA y cierra el acceso por columna. El DROP COLUMN va en una
-- migracion aparte, despues de que el codigo que dejo de leerla este deployado:
-- .github/workflows/db-deploy.yml pushea las migraciones y Vercel deploya en
-- paralelo desde el mismo commit, asi que dropear aca abriria una ventana en la
-- que el codigo viejo hace .select('access_token') contra un schema que ya no la
-- tiene, y el webhook se cae. Expand ahora, contract despues.

update public.whatsapp_accounts
   set access_token = null
 where access_token is not null;

-- Cinturon mientras la columna exista: el UPDATE de arriba nulea lo que ya hay,
-- pero db-deploy.yml y el deploy de Vercel corren en paralelo — hay una ventana
-- en la que el codigo viejo todavia puede escribir un token via connect-manual.
--
-- OJO: `revoke select (access_token) ... from authenticated` a secas es un no-op.
-- Postgres ignora un revoke por columna cuando el rol tiene el privilegio a nivel
-- de TABLA (que es como venian los grants del baseline). Hay que bajar el grant
-- de tabla y re-otorgar columna por columna.
revoke select, insert, update on public.whatsapp_accounts from authenticated;

grant select (id, org_id, waba_id, phone_number_id, phone_number,
              status, connected_at, created_at, updated_at)
  on public.whatsapp_accounts to authenticated;
grant insert (id, org_id, waba_id, phone_number_id, phone_number,
              status, connected_at, created_at, updated_at)
  on public.whatsapp_accounts to authenticated;
-- org_id va en el UPDATE porque /api/whatsapp/connect y connect-manual hacen
-- .upsert({...}, {onConflict:'org_id'}) con el cliente del usuario: PostgREST lo
-- traduce a INSERT ... ON CONFLICT DO UPDATE SET <todas las columnas del payload>,
-- org_id incluido.
grant update (org_id, waba_id, phone_number_id, phone_number,
              status, connected_at, updated_at)
  on public.whatsapp_accounts to authenticated;
-- DELETE se deja a nivel de tabla: lo usa /api/whatsapp/disconnect y no tiene
-- granularidad por columna.

comment on column public.whatsapp_accounts.access_token is
  'DEPRECADO — siempre null. El runtime usa META_SYSTEM_USER_TOKEN '
  '(lib/whatsapp/token.ts). Se dropea en la migracion siguiente.';
