-- Media entrante de WhatsApp (imagenes por ahora).
-- messages.media_url guarda el PATH dentro del bucket (no una URL firmada):
-- {org_id}/{conversation_id}/{message_uuid}.webp
alter table public.messages
  add column if not exists media_url text,
  add column if not exists media_type text;

comment on column public.messages.media_url is 'Path en el bucket chat-media. NULL si no hay media o ya expiro (cron de limpieza).';
comment on column public.messages.media_type is 'Tipo de media original de WhatsApp: image | video | document | sticker.';

-- Bucket privado para media de conversaciones. Solo se guarda la version
-- comprimida (webp <=1280px); el original nunca se persiste.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- Lectura: solo miembros de la org duena del archivo. El primer folder del
-- path es el org_id, mismo aislamiento que las tablas.
create policy "chat_media_select_own_org"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

-- Escritura/borrado: solo service role (webhook y cron). Sin policy para
-- authenticated = denegado por RLS.
