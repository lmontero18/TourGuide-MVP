-- CODE-151 (M8) · contract: dropear whatsapp_accounts.access_token.
--
-- Segunda mitad del expand/contract que empezo 20260727130000. Aquella nuleo la
-- columna y le saco los grants; esta la elimina. Va en un deploy aparte porque
-- db-deploy.yml y Vercel corren en paralelo desde el mismo commit: si el DROP
-- entraba junto con el codigo, habia una ventana en la que el codigo viejo hacia
-- .select('access_token') contra un schema que ya no la tenia.
--
-- Ningun consumidor la lee:
--   - app: cero referencias a la columna (el `access_token` que queda en
--     connect/connect-manual es el token del OAuth de Meta, usado in-flight, y
--     el del payload a n8n, que sale de META_SYSTEM_USER_TOKEN).
--   - n8n: recibe el token en el body del webhook, nunca consulto la tabla
--     (n8n/workflows/*.json, nodos 'Push message into redis db' ->
--      'Code in JavaScript' -> 'Send MSG').
--   - prod: verificado que la columna esta 100% en null antes de dropear.
--
-- El runtime opera con el System User token central (lib/whatsapp/token.ts).
-- Si algun dia hace falta un token por org (WABA no compartido con nuestro
-- Business Manager), no se vuelve a agregar en claro: va cifrado o en Vault.

alter table public.whatsapp_accounts drop column access_token;

comment on table public.whatsapp_accounts is
  'Routing de WhatsApp por org: waba_id + phone_number_id. NO guarda credenciales '
  '— el token de mensajeria es central (META_SYSTEM_USER_TOKEN).';
