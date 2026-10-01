-- Ultima vez que Meta rechazo un envio por falta de metodo de pago (error
-- 131042). Tourfy es Tech Provider: no puede leer la tarjeta de la WABA del
-- cliente, asi que este rechazo es la unica senal real. Lo escribe el server
-- (service role) desde el webhook de statuses y las rutas de envio; se limpia
-- cuando un envio pagado vuelve a salir bien.
alter table public.whatsapp_accounts
  add column if not exists payment_failed_at timestamptz;

-- Grants por columna (ver 20260727130000): solo lectura para authenticated.
grant select (payment_failed_at) on public.whatsapp_accounts to authenticated;
