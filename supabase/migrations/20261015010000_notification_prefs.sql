-- Avisos por persona (CODE-195). El admin decide quien recibe los avisos de
-- "un cliente necesita atencion" (traspasos sin tomar, bot sin respuesta):
--   notify_scope 'all'  → todos, como hasta ahora
--                'mine' → solo lo que le asignan (eso le llega siempre)
--   notify_sound        → sonido de los avisos en el panel
-- Por defecto todo queda como hoy. Solo SELECT para authenticated: lo cambia
-- el admin via /api/agents/[id]/notifications (service role), un agente no
-- puede cambiarse lo suyo.
alter table public.users
  add column if not exists notify_scope text not null default 'all'
    check (notify_scope in ('all', 'mine')),
  add column if not exists notify_sound boolean not null default true;

grant select (notify_scope, notify_sound) on public.users to authenticated;
