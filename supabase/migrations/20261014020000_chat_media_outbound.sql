-- Archivos que el agente manda desde el chat (CODE-194): fotos jpeg/png y PDFs
-- van al mismo bucket privado chat-media, en {org_id}/{conversation_id}/out-*.
-- Los sube el navegador con una URL firmada de un solo uso que crea el server
-- (service role); authenticated sigue sin policy de escritura en el bucket.
-- El limite por archivo sube de 1 MB a 16 MB (las imagenes entrantes siguen
-- guardandose comprimidas en webp, muy por debajo).
update storage.buckets
   set file_size_limit = 16777216,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
 where id = 'chat-media';
