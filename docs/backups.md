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

`db-backup.yml` corre diario (`0 9 * * *` UTC) y sube a R2 tres archivos por corrida (`supabase db dump` sin flags solo exporta el schema — hacen falta 3 dumps separados para roles, schema y datos):

| Artefacto en R2 | Comando | Contenido |
|---|---|---|
| `db/tourguide-prod-<fecha>-roles.sql.gz` | `supabase db dump --linked -f roles.sql --role-only` | Roles custom (sin passwords) |
| `db/tourguide-prod-<fecha>-schema.sql.gz` | `supabase db dump --linked -f schema.sql` | DDL: tablas, políticas RLS, funciones, triggers |
| `db/tourguide-prod-<fecha>-data.sql.gz` | `supabase db dump --linked -f data.sql --use-copy --data-only` | Filas de todas las tablas |

Además sincroniza Storage a `storage/` en el mismo bucket, y notifica a BetterStack via heartbeat si falla.

## Decisión

- **No se activa PITR** por ahora — el costo no se justifica dado que ya existe el dump diario a R2 como red de seguridad adicional a los 7 días nativos de Supabase.
- Revisar esta decisión si el volumen de datos/transacciones crece al punto de que perder hasta 24h de datos sea inaceptable — en ese caso, evaluar PITR con retención de 7 días (~$100/mes).

## Manejo de datos de producción — controles obligatorios

Los dumps en R2 contienen PII real de clientes (teléfonos, contenido de conversaciones de WhatsApp, emails). Reglas no negociables:

1. **Nunca restaurar un dump de prod al Supabase local de uso diario.** Un restore real (no un drill de prueba) va siempre a un proyecto Supabase temporal y descartable — nunca al ambiente donde alguien desarrolla features día a día.
2. **Tear down inmediato después de cualquier restore.** Al terminar de verificar: eliminar el proyecto/instancia destino y borrar los `.sql` locales (`rm roles.sql schema.sql data.sql`). No deben quedar copias de datos reales en un laptop.
3. **Acceso a R2 restringido.** `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` viven solo como GitHub Actions secrets — no se bajan a máquinas personales salvo para un restore explícitamente autorizado.
4. **Restore real requiere aprobación previa** (mismo criterio que un incidente) — no es un comando que cualquiera corre para "revisar algo".

El restore de prueba documentado abajo se verificó con datos de fixtures/seed local (`supabase start` + `seed.sql`), **no con un dump real de prod** — confirma que los comandos y el orden funcionan sin exponer PII real.

## Restore — procedimiento probado

Ver `docs/m4/` (notas locales, no versionadas) para el log del restore de prueba. Resumen:

1. **Backup nativo de Supabase (daily):** Dashboard → Database → Backups → elegir fecha → Restore. Proyecto queda offline durante el proceso.
2. **Dump propio (R2) — orden importa: roles → schema → data → Storage.**
   Restaurar Storage antes que la DB deja archivos huérfanos sin fila que los referencie; por eso la DB va primero.
   ```bash
   fecha=<fecha>  # ej. 2026-07-29

   # Descargar los 3 archivos
   for part in roles schema data; do
     aws s3 cp "s3://$R2_BUCKET/db/tourguide-prod-$fecha-$part.sql.gz" "./$part.sql.gz" \
       --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
     gunzip "$part.sql.gz"
   done

   # $DATABASE_URL debe apuntar a un proyecto TEMPORAL Y DESCARTABLE
   # (ver "Manejo de datos de producción" arriba) -- nunca al Supabase
   # local de uso diario ni a un ambiente compartido.
   psql \
     --single-transaction \
     --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "$DATABASE_URL"

   # Recién después, restaurar Storage (sync desde storage/ en R2 al bucket destino)

   # Al terminar de verificar: borrar el proyecto destino y los .sql locales
   rm roles.sql schema.sql data.sql
   ```
   `session_replication_role = replica` desactiva triggers durante la carga de datos (evita, ej., doble-encriptación en columnas con trigger de cifrado).

   Verificado localmente contra el stack de `supabase start`: los 3 dumps aplican limpios en ese orden y los datos quedan consistentes. Este drill usó datos de fixtures/seed, no un dump real de prod.
