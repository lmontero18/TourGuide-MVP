-- "Eliminar conversacion" pasa a ser borrado logico. Antes borraba la
-- conversacion y todos sus mensajes: las metricas (que se calculan sobre
-- messages) y la card de uso del tier gratis de Meta bajaban, aunque Meta ya
-- habia cobrado esos mensajes.
--
-- deleted_at != null = oculta del inbox. Los mensajes quedan y siguen
-- contando en metricas. Si el cliente vuelve a escribir, el webhook la
-- restaura (deleted_at = null, abierta, bot activo).

alter table public.conversations add column deleted_at timestamptz;

-- La lista filtra por org + no eliminadas.
create index idx_conversations_org_not_deleted
  on public.conversations (org_id, last_message_at desc)
  where deleted_at is null;

-- No leidos: ignorar conversaciones eliminadas (resto igual a
-- 20260930040000_conversation_reads.sql).
create or replace function public.get_unread_counts()
returns table (conversation_id uuid, unread bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, count(m.id)
  from public.conversations c
  join public.users u on u.id = auth.uid()
  left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = u.id
  join public.messages m
    on m.conversation_id = c.id
   and m.role = 'user'
   and m.created_at > coalesce(r.last_read_at, u.created_at)
  where c.org_id = public.get_user_org_id()
    and c.deleted_at is null
  group by c.id
$$;
