-- Modelo B (token central de System User): ya no guardamos el access_token
-- por organizacion. /api/whatsapp/connect inserta access_token = null,
-- por lo que la columna no puede seguir siendo NOT NULL.
alter table public.whatsapp_accounts alter column access_token drop not null;
