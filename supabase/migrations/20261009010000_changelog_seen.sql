-- Panel de Novedades: hasta cuando vio cada usuario las novedades de Tourfy
-- (el punto del icono se apaga al abrirlo). Por usuario y en la DB para que
-- valga en todos sus dispositivos. Las novedades viven en lib/changelog.ts.
alter table public.users
  add column if not exists changelog_seen_at timestamptz;

grant update (changelog_seen_at) on public.users to authenticated;
