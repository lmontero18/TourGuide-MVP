-- Quien envio cada mensaje de agente (CODE-179) y, si fue una plantilla,
-- cual. Con esto sale el historial de plantillas: cuantas, cuales, quien las
-- mando y como terminaron (delivery_status).
alter table public.messages
  add column if not exists sender_id uuid references public.users(id) on delete set null,
  add column if not exists template_name text,
  add column if not exists template_language text,
  add column if not exists template_category text
    check (template_category in ('UTILITY', 'MARKETING', 'AUTHENTICATION'));

-- Historial de plantillas: solo filas con plantilla, mas recientes primero.
create index if not exists idx_messages_templates
  on public.messages (created_at desc)
  where template_name is not null;

create index if not exists idx_messages_sender
  on public.messages (sender_id)
  where sender_id is not null;
