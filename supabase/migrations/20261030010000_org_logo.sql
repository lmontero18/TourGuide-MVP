-- Logo de la agencia arriba del menu (flag `orgBranding`).
--
-- 1. organizations.logo_path: ruta del archivo en el bucket org-logos
--    ("<org_id>/<timestamp>.png"). null = sin logo, el menu muestra iniciales.
--    Solo lectura para authenticated: lo escribe /api/organizations/logo con
--    service role despues de validar que quien sube es admin.
-- 2. Bucket org-logos publico: el logo no es dato sensible y asi se muestra
--    con una URL fija, sin firmar cada vez. Sin policies sobre storage.objects:
--    nadie lista ni escribe desde el cliente, solo el server.
alter table public.organizations
  add column logo_path text;

grant select (logo_path) on public.organizations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-logos', 'org-logos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
