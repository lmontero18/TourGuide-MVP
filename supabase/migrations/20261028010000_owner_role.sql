-- Rol 'owner': el dueño / CEO de la agencia. Cuenta de solo lectura que ve
-- Métricas (negocio y equipo) y nada más. Va en su propia migracion: un valor
-- nuevo de enum no se puede usar en la misma transaccion que lo crea. Las
-- reglas que lo dejan solo-lectura estan en 20261028020000_owner_readonly.sql.
alter type public.user_role add value if not exists 'owner';
