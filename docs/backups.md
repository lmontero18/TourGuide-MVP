# Backups — qué cubre Supabase vs. qué cubrimos nosotros

Confirmación del plan actual (ticket CODE-147 / M4) y por qué existe el pipeline propio de `pg_dump` a R2.

---

## Plan actual (verificado vía Management API, 2026-07-29)

- **Organización:** NAIA — plan **Pro**
- **Proyecto prod:** `bppgwfzzrurlqzfzcpzf` (Tourguide-prod), Postgres 17.6, `us-east-2`

## Qué incluye Supabase Pro

| Feature | Estado en este proyecto |
|---|---|
| **Backups diarios** | ✅ Activos. Físicos (WAL-G), automáticos, sin configuración manual. |
| **Retención de backups diarios** | 7 días en plan Pro (Team = 14, Enterprise = 30). Confirmado: la API devuelve una ventana móvil de ~7-8 backups diarios completados. |
| **PITR (Point-in-Time Recovery)** | Disponible como add-on de pago en Pro. **No está habilitado** en este proyecto (`pitr_enabled: false`). Sin PITR, el RPO real es "hasta 24h" (el backup diario de la madrugada), no segundos. |
| **Restore** | Vía Dashboard (Database > Backups) o Management API (`POST /v1/projects/{ref}/database/backups/restore-pitr` para PITR; para daily backups, restore desde el dashboard). El proyecto queda inaccesible durante el restore. |
| **Storage (buckets)** | Los backups de Supabase **NO incluyen objetos de Storage**, solo metadata. Por eso `db-backup.yml` sincroniza Storage a R2 por separado. |

## Por qué igual tenemos `pg_dump` propio a R2

1. **Retención corta:** 7 días de Supabase no alcanza si un problema se detecta tarde (ej. corrupción de datos que pasó desapercibida 2 semanas).
2. **Sin PITR:** activarlo cuesta ~$100-400/mes según retención (ver [pricing](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery)) — no se justifica en esta etapa del producto. El dump diario a R2 es la alternativa de bajo costo.
3. **Independencia del proveedor:** si Supabase tiene un incidente o se pierde el proyecto, el dump en R2 (cuenta propia, Cloudflare) es un respaldo fuera de su plataforma.
4. **Storage no cubierto:** como se explica arriba, hay que respaldarlo aparte.

`db-backup.yml` corre diario (`0 9 * * *` UTC), hace `supabase db dump` + sync de Storage, sube todo a R2, y notifica a BetterStack via heartbeat si falla.

## Decisión

- **No se activa PITR** por ahora — el costo no se justifica dado que ya existe el dump diario a R2 como red de seguridad adicional a los 7 días nativos de Supabase.
- Revisar esta decisión si el volumen de datos/transacciones crece al punto de que perder hasta 24h de datos sea inaceptable — en ese caso, evaluar PITR con retención de 7 días (~$100/mes).

## Restore — procedimiento probado

Ver `docs/m4/` (notas locales, no versionadas) para el log del restore de prueba. Resumen:

1. **Backup nativo de Supabase (daily):** Dashboard → Database → Backups → elegir fecha → Restore. Proyecto queda offline durante el proceso.
2. **Dump propio (R2):**
   ```bash
   # Descargar el dump más reciente
   aws s3 cp "s3://$R2_BUCKET/db/tourguide-prod-<fecha>.sql.gz" ./dump.sql.gz \
     --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
   gunzip dump.sql.gz

   # Restaurar a un proyecto (local o uno nuevo de Supabase)
   psql "$DATABASE_URL" -f dump.sql
   ```
   Verificado localmente contra el stack de `supabase start`: el dump aplica limpio y los datos quedan consistentes.
