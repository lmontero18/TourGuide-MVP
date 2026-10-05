-- Estado de entrega de los mensajes que enviamos (agentes y plantillas).
-- Meta acepta el envio al instante y avisa despues por el webhook si se
-- entrego, se leyo o fallo (ej. 131042 sin metodo de pago). Se guarda en el
-- propio mensaje (por wa_message_id) para mostrarlo en el chat.
alter table public.messages
  add column if not exists delivery_status text
    check (delivery_status in ('sent', 'delivered', 'read', 'failed')),
  add column if not exists delivery_error_code integer,
  add column if not exists delivery_updated_at timestamptz;

-- Lo escribe el server (service role) desde el webhook. Los mensajes ya se
-- leen por RLS (messages_select_own_org) y viajan por realtime (UPDATE).
