-- Archivos de chat-media que ya no tienen mensaje (conversacion, contacto o
-- agencia borrados: el cascade borra los mensajes pero no el archivo). El cron
-- cleanup-media los encuentra con esta funcion y los borra por la API de
-- Storage.
--
-- Solo los de mas de 1 dia: el archivo se sube ANTES de insertar su mensaje
-- (webhook y envio del agente), asi que uno recien subido todavia no tiene
-- mensaje y no es basura.
--
-- security definer porque service_role no ve storage.objects por PostgREST;
-- execute solo para service_role.
create index if not exists messages_media_url_idx
  on public.messages (media_url)
  where media_url is not null;

create or replace function public.chat_media_orphans(p_limit int)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'chat-media'
     and o.created_at < now() - interval '1 day'
     and not exists (select 1 from public.messages m where m.media_url = o.name)
   order by o.created_at
   limit least(greatest(p_limit, 1), 1000);
$$;

revoke execute on function public.chat_media_orphans(int) from public, anon, authenticated;
grant execute on function public.chat_media_orphans(int) to service_role;
