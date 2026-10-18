-- Recogidas: una celda puede decir explicitamente "no recoge" ('none'),
-- distinto de una celda sin cargar (sin fila). El bot los trata distinto: con
-- 'none' dice que no hay recogida en ese hotel; sin cargar lo pasa al equipo.
alter table public.pickup_times drop constraint if exists pickup_times_pickup_time_check;
alter table public.pickup_times
  add constraint pickup_times_pickup_time_check
  check (pickup_time = 'none' or pickup_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$');
