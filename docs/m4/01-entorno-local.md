# Paso 01 — Asegurar el entorno local (dev)

> Estado: **borrador para revisión**. No ejecuto nada hasta tu visto bueno.
> Parte de: `docs/m4/PLAN-GENERAL.md`

---

## Objetivo del paso

Dejar el **entorno de desarrollo local funcionando y reproducible** por Docker:
levantar todo el stack de Supabase en contenedores, aplicar las migraciones
versionadas, y confirmar que la app Next.js se conecta a ese Supabase local.

Esto es el "dev" de **dev → staging → prod** y la base para poder escribir y
probar migraciones, tipos y tests de RLS sin tocar staging ni producción.

Ya existe la guía `docs/supabase-local-setup.md`; este paso es **ejecutarla,
verificar que funciona de punta a punta**, y cerrar los huecos que encontremos.

---

## Estado de precondiciones (verificado 2026-06-30)

| Requisito | Estado | Notas |
|---|---|---|
| **Docker Desktop** corriendo | ✅ "Engine running" | sin contenedores aún |
| **Node 24** | ❌ tienes `v20.19.0` | nvm-windows presente (también 18.x). Hay que `nvm install 24` |
| **pnpm** vía corepack | a verificar | `corepack enable` si hace falta |
| Deps instaladas | a verificar | el CLI viene como devDep |

> Node 20 **técnicamente sirve** (el CLI solo rechaza 25+), pero estandarizamos en
> **24** por consistencia de equipo (SaaS profesional). El `nvm use 24` puede pedir
> admin en Windows; si lo pide, ese comando lo corres tú.

---

## Decisiones tomadas

- **Q3 — seed:** SÍ incluyo `supabase/seed.sql` con 2 organizaciones de prueba (A y B),
  cada una con su usuario y datos. Base para dev realista y para los tests RLS (paso 07).
- **Q4 — `.env.local`:** SÍ lo reescribo a credenciales locales, dejando `.env.local.bak`
  con lo que haya ahora (probablemente staging/prod).

---

## Modelo de ejecución

Claude corre **en esta máquina** (PowerShell local, Docker local). Por lo tanto
**ejecuto yo los comandos**, parando en cada checkpoint y ante cualquier error.
Único comando que podría requerir que lo corras tú: `nvm use 24` (si pide admin).

---

## Acciones que ejecutaría (en orden)

> Todos los comandos con `pnpm dlx supabase ...` usan la versión pineada del CLI.
> En Windows, con `nvm use 24` activo, no hace falta prefijo de PATH.

0. **Instalar y activar Node 24**
   `nvm install 24` → `nvm use 24` → `node -v` (debe ser 24.x).
   Si `nvm use` pide admin, te paso ese comando y sigo cuando confirmes.

1. **Verificar prerequisitos**
   `node -v` (24.x), `docker ps` (Docker corriendo), `pnpm -v` (corepack), `pnpm install`.
   Si algo falla, paro y te aviso — no improviso.

2. **Levantar el stack local**
   `pnpm dlx supabase start`
   (Primera vez: descarga imágenes Docker, tarda minutos.)
   Resultado esperado: imprime API URL, DB URL, Studio, Mailpit y las llaves.

3. **Aplicar el schema desde migraciones**
   `pnpm dlx supabase db reset`
   Recrea la DB local y corre las 2 migraciones en orden:
   - `..._remote_schema.sql` (tablas base + RLS)
   - `..._auth_user_trigger.sql` (trigger `handle_new_user`)
   Verifico que termine sin errores.

4. **Configurar `.env.local`** apuntando a local
   Las llaves locales son defaults públicos de demo (seguras). Confirmo que
   `.env.local` tenga `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   y `SUPABASE_SERVICE_ROLE_KEY` apuntando al stack local.
   > ⚠️ Hoy `.env.local` probablemente apunta a **staging/prod**. Antes de tocarlo
   > hago un respaldo (`.env.local.bak`) para que puedas volver fácil.

5. **Arrancar la app y probar el ciclo completo**
   `pnpm dev` → registrar un usuario → el email de confirmación cae en **Mailpit**
   (`http://127.0.0.1:54324`, no tu inbox real) → confirmar → login.
   Si el login funciona, dev local ↔ Supabase local está OK.

6. **Generar tipos desde el schema local** (prepara el paso 02)
   `pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts`
   Esto deja los tipos sincronizados con las migraciones y fija el comando
   estándar que luego validará la CI.

---

## Seed de datos (incluido — decisión Q3)

**Crear `supabase/seed.sql` con datos de prueba de 2 organizaciones.**

- El seed está habilitado en `config.toml` pero **no existe el archivo**.
- Un seed con **2 orgs (A y B), cada una con su usuario y datos**, sirve para:
  - tener data realista al desarrollar localmente,
  - ser la **base de los tests de aislamiento RLS** (paso 07: org A no ve datos de org B).
- Se aplica solo en `db reset` local; **no** toca staging/prod.
- Lo escribo respetando el schema real (organizations, users, contacts,
  conversations, messages, leads) y lo dejo para tu revisión antes del `db reset`.

---

## Entregables de este paso — RESULTADO (2026-06-30)

- [x] Stack de Supabase local levantando con `supabase start`. ✅
- [x] `db reset` aplica las migraciones + seed sin error. ✅
- [x] `.env.local` apuntando a local — **ya estaba** (llaves = `supabase status`). No requirió cambios ni backup. ✅
- [x] Login funcionando — validado vía endpoint de auth con `admin-a@tourguide.test`. ✅
- [x] `supabase/seed.sql` con 2 orgs (A/B), usuarios admin+agent, contactos, conversaciones, mensajes y leads. ✅
- [x] Bonus: aislamiento RLS demostrado en dry-run (org A no ve datos de org B). ✅
- [ ] ~~`lib/supabase/types.ts` regenerado~~ → **DIFERIDO al paso 02.** Ver hallazgo abajo.

## Hallazgo importante (para el paso 02)

`lib/supabase/types.ts` **NO son tipos generados**: es un stub de 5 líneas que
re-exporta los tipos hechos a mano de `@/types`. Además **ningún archivo importa
de `@/lib/supabase/types`** (búsqueda confirmada) — el stub está sin uso. El
codebase tipa todo con `@/types/index.ts`.

Decisión a tomar en el paso 02: ¿migramos a tipos generados (`Database`,
`Tables<>`, enums) como pide el entregable #4, o mantenemos `@/types` a mano y la
CI solo verifica que el schema no cambió? Es un refactor de fuente de tipos, no
parte del setup local.

---

## Riesgos / cosas que pueden fallar

| Riesgo | Plan |
|---|---|
| Docker no está corriendo | Paro y te pido abrir Docker Desktop |
| Node 25+ activo | Paro y te recuerdo `nvm use 24` |
| Puerto `54321` ocupado | `supabase stop` y reintento |
| `.env.local` se pierde | Hago `.env.local.bak` antes de tocarlo |
| `db reset` falla por una migración | Te reporto el error exacto, no improviso fixes de schema |

---

## Estado de aprobación

- [x] Plan aprobado por el usuario ("el plan 01-entorno-local me gusta").
- [x] Q1 Docker corriendo · Q3 seed incluido · Q4 `.env.local` con backup.
- [ ] **Falta tu "dale" final** para empezar a ejecutar (arranco por `nvm install 24`).

> Checkpoints donde me detengo a mostrarte resultado: tras instalar Node 24,
> tras `supabase start`, tras `db reset`, y antes de reescribir `.env.local`.
