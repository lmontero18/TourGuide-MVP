-- Idempotencia del webhook de WhatsApp: Meta reintenta la entrega si no recibe
-- 200 a tiempo. Guardamos el id del mensaje de Meta (wamid) para detectar
-- reintentos y no insertar mensajes ni subir media duplicados.
alter table public.messages
  add column if not exists wa_message_id text;

comment on column public.messages.wa_message_id is
  'Id del mensaje en Meta (wamid). Unico — dedupe de reintentos del webhook. NULL en mensajes de bot/agente.';

-- Parcial: solo los mensajes entrantes de WhatsApp traen wamid.
create unique index if not exists messages_wa_message_id_key
  on public.messages (wa_message_id)
  where wa_message_id is not null;
