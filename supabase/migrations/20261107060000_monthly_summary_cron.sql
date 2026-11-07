-- CODE-206: resumen mensual por correo (solo Pro). Igual que el diario:
-- pg_cron llama a la ruta cada hora y la ruta manda solo a las agencias donde
-- es el dia 1 a las 8:00 (su zona horaria). Minuto 5 para no pisarse con el
-- diario. Sin los secretos de Vault (app_base_url, cron_secret) no hace nada.
select cron.schedule('tourfy-monthly-summary', '5 * * * *', $$select private.call_app_cron('/api/cron/monthly-summary')$$);
