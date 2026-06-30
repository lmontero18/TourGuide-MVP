# M4 · Base de datos profesional: migraciones + backups — PLAN GENERAL

> Estado: **borrador para revisión**. Nada se ejecuta hasta que des el visto bueno.
> Issue Linear: CODE-147 · Rama: `luisvale2001/code-147-m4-...`

---

## Objetivo de M4

Que el schema de la base de datos sea **reproducible, versionado y respaldado**.

**Done cuando:** un cambio de schema nace como migración en un PR, se aplica solo, y existe un backup restaurable verificado.

---

## Cómo vamos a trabajar (acordado)

1. Antes de cualquier acción o ejecución, escribo un **plan en `.md`** dentro de `docs/m4/`.
2. Tú lo **analizas**.
3. Solo con tu **visto bueno explícito**, ejecuto ese paso.
4. Repetimos por cada paso. Un `.md` por paso (`01-...`, `02-...`).

---

## Estado actual verificado (lo que YA existe)

| Pieza | Estado |
|---|---|
| Carpeta `supabase/` con `config.toml` | ✅ existe |
| CLI de Supabase como dependencia (`supabase@^2.107.0`) | ✅ instalada |
| Migraciones versionadas en git | ✅ 2 archivos: `..._remote_schema.sql` y `..._auth_user_trigger.sql` |
| Doc de setup local | ✅ `docs/supabase-local-setup.md` (Mac + Windows, Docker) |
| Regla "schema solo por migración" | 🟡 escrita en `CONTRIBUTING.md`, falta el "cómo" |
| `supabase/seed.sql` (datos de prueba) | ❌ no existe (seed habilitado en config pero sin archivo) |
| CI de migraciones (`.github/workflows/`) | ❌ no existe |
| Generación de tipos en CI | ❌ hoy `lib/supabase/types.ts` se genera a mano |
| Backups propios (pg_dump externo) | ❌ no existe |
| Restore probado | ❌ no existe |
| Tests de aislamiento RLS | ❌ no existe |

**Entornos (de M3):**
- **dev** = local, por Docker (lo que vamos a asegurar primero)
- **staging** = proyecto Supabase `gxhqvgfasbtctvxhaqoy` + rama `staging` (deploy Vercel)
- **prod** = proyecto Supabase `bppgwfzzrurlqzfzcpzf` + rama `main` (deploy Vercel)
- Flujo: **dev → staging → prod**

---

## Mapeo de los 8 entregables del issue

| # | Entregable del issue | Paso del plan |
|---|---|---|
| 1 | Migraciones con Supabase CLI versionadas en git | ✅ ya hecho (se refuerza en paso 02) |
| 2 | Regla dura: nada de cambios de schema en dashboard | Paso 03 |
| 3 | Aplicación automática de migraciones vía CI al mergear | Paso 02 |
| 4 | Generación de tipos en CI siempre en sync | Paso 02 |
| 5 | Backups: confirmar qué da el plan de Supabase | Paso 04 |
| 6 | `pg_dump` periódico a almacenamiento externo (R2/S3) | Paso 05 |
| 7 | Documentar y probar el restore una vez | Paso 06 |
| 8 | Tests de aislamiento RLS (org A no lee datos de org B) | Paso 07 |

---

## Orden de ejecución propuesto

> Reordenado para empezar por **dev local** (tu sugerencia): es la base de todo y
> nos permite probar migraciones, tipos y RLS sin tocar staging/prod.

1. **Paso 01 — Asegurar el entorno local (dev)** ← *empezamos aquí*
   Docker + `supabase start` + `db reset` aplicando migraciones, app conectada a local.
   Detalle en `docs/m4/01-entorno-local.md`.

2. **Paso 02 — CI: aplicar migraciones + tipos en sync** (entregables #3, #4, refuerza #1)
   Workflows GitHub Actions: PR valida; push a `staging`/`main` aplica.

3. **Paso 03 — Documentar la regla dura** (entregable #2)
   El "cómo" del flujo de migraciones en `CONTRIBUTING.md`.

4. **Paso 04 — Confirmar plan de backups de Supabase** (entregable #5)
   Consulta read-only (MCP/dashboard): backups diarios, retención, PITR.

5. **Paso 05 — `pg_dump` externo periódico** (entregable #6)
   GitHub Action programada → R2/S3.

6. **Paso 06 — Restore documentado y probado** (entregable #7)
   Probar el restore una vez desde el backup propio.

7. **Paso 07 — Tests de aislamiento RLS** (entregable #8)
   Verificar que org A no puede leer datos de org B.

---

## Próximo paso

Revisa **`docs/m4/01-entorno-local.md`**. Cuando lo apruebes, ejecuto solo ese paso.
