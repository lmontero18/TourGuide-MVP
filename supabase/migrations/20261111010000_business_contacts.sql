-- Contactos de negocio (flag businessContacts).
--
-- Agencias, proveedores o socios que escriben al WhatsApp de la agencia y no
-- son clientes. Hoy el bot los pasa a un humano, pero al resolverse la
-- conversacion el bot se vuelve a prender y la proxima vez les responde otra
-- vez. Con kind = 'business' el bot queda apagado para ese contacto en todas
-- sus conversaciones, sus chats van a la pestaña Negocios y no crean leads.
--
-- kind_locked: lo decidio una persona desde el chat. La IA solo clasifica
-- contactos sin bloquear, asi no pisa una correccion del equipo.
--
-- contacts ya tiene grants de tabla para authenticated y RLS por org: las
-- columnas nuevas quedan cubiertas igual que las demas.

alter table public.contacts
  add column if not exists kind text not null default 'customer'
    check (kind in ('customer', 'business')),
  add column if not exists kind_locked boolean not null default false;

comment on column public.contacts.kind is
  'customer = viajero (lo atiende el bot); business = agencia/proveedor/socio (bot apagado siempre, sin leads).';
comment on column public.contacts.kind_locked is
  'true si una persona eligio kind desde el chat: la IA no lo cambia.';
