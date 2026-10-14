-- Captura de pantalla opcional en "Enviar comentarios": se guarda en un bucket
-- privado (por si falla el correo) y va adjunta al correo al equipo. Solo el
-- server (service role) lee y escribe: sin policies para authenticated.
alter table public.feedback
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
