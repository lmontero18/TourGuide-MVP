-- No leidos por agente (inbox compartido): cada usuario tiene su propio
-- "leido hasta" por conversacion. Si un agente lee, a los demas les sigue
-- apareciendo como no leida.
--
-- Solo cuentan los mensajes del cliente (role = 'user'): las respuestas del
-- bot y de otros agentes no son algo que el equipo tenga que "leer".

create table public.conversation_reads (
  user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

alter table public.conversation_reads enable row level security;

revoke all on table public.conversation_reads from anon, public;
grant select, insert, update on table public.conversation_reads to authenticated;

create policy conversation_reads_select_own on public.conversation_reads
  for select to authenticated
  using (user_id = auth.uid());

-- Solo sobre conversaciones de la propia org: sin esto, un usuario podria
-- crear filas apuntando a conversaciones de otra agencia (no filtra datos,
-- pero ensucia y confirma que el id existe).
create policy conversation_reads_insert_own on public.conversation_reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and conversation_id in (select id from public.conversations where org_id = public.get_user_org_id())
  );

create policy conversation_reads_update_own on public.conversation_reads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Contar no leidos = mensajes del cliente de una conversacion despues de una
-- fecha. Parcial sobre role = 'user': es el unico role que se cuenta.
create index idx_messages_conversation_user_created
  on public.messages (conversation_id, created_at)
  where role = 'user';

-- No leidos del usuario actual, por conversacion (solo las que tienen > 0).
-- Sin fila en conversation_reads = nunca la abrio: cuenta desde que el usuario
-- se unio al equipo, no desde el inicio de los tiempos.
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
  group by c.id
$$;

-- Marca una conversacion como leida por el usuario actual (upsert).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.conversation_reads (user_id, conversation_id, last_read_at)
  values (auth.uid(), p_conversation_id, now())
  on conflict (user_id, conversation_id) do update set last_read_at = excluded.last_read_at
$$;

revoke all on function public.get_unread_counts() from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.get_unread_counts() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
