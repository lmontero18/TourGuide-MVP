# Paso 02 — CI: aplicar migraciones + tipos en sync

> Estado: **borrador para revisión**. No ejecuto nada hasta tu visto bueno.
> Parte de: `docs/m4/PLAN-GENERAL.md`
> Cubre entregables del issue: **#3** (aplicación automática vía CI), **#4** (tipos
> generados en sync) y refuerza **#1** (migraciones versionadas).

---

## Decisiones ya tomadas

- **Estrategia de tipos: Opción A (híbrido).**
  `lib/supabase/types.ts` pasa a ser el archivo **generado de verdad** y la CI
  verifica que no se desincronice (drift check). `@/types` se queda como capa de
  dominio ergonómica. La adopción de los tipos generados en el código es **gradual
  y opcional**, NO parte de este paso (no tocamos imports existentes).

## Estado remoto verificado (read-only, hoy)

- **staging** (`gxhqvgfasbtctvxhaqoy`) y **prod** (`bppgwfzzrurlqzfzcpzf`) **ya tienen
  registradas** las 2 migraciones (`20260622035843`, `20260622035844`).
- staging es un mirror real del schema (10 tablas, RLS activo, vacías).
- **Implicación:** `supabase db push` desde la CI NO re-aplica la base; solo aplicará
  migraciones **nuevas**. No hace falta `migration repair`. ✅

---

## DECISIÓN TOMADA (2026-06-30)

**Flujo elegido (híbrido trunk-based + staging manual para testeo):**
- Los **PR van contra `main`** (con review de CodeRabbit). `CONTRIBUTING.md` NO cambia su modelo.
- **Para testear antes de mergear:** `git merge` de la feature a `staging` + `git push origin staging`
  → la CI aplica esas migraciones al **Supabase staging**.
- **Al mergear el PR a `main`** → la CI aplica al **Supabase prod**.
- `db-deploy.yml` dispara en push a **ambas** ramas (`staging` y `main`), cubriendo este flujo.
- Tipos: regenerar `types.ts` (sí). Script `db:types`: sí.
- En el paso 03 solo **documentamos** el flujo de testeo por staging (no cambia el modelo de PR).

---

## (Histórico) Opciones que se evaluaron

Hay una tensión entre el `CONTRIBUTING.md` actual y el flujo dev→staging→prod:

- Hoy `CONTRIBUTING.md` dice **trunk-based**: PR directo a `main` = producción.
- Pero quieres **dev → staging → prod**, y ya existe la rama `staging`.

Dos formas de armar la CI:

### Opción 1 — Modelo de ramas por entorno (recomendada, hace real dev→staging→prod)
```text
feature ──PR──▶ staging ──(CI aplica a Supabase staging + Vercel staging)
                   │
                   └─merge──▶ main ──(CI aplica a Supabase prod + Vercel prod)
```
- Merge a `staging` → migraciones a proyecto staging.
- Merge `staging`→`main` → migraciones a prod.
- **Requiere** actualizar `CONTRIBUTING.md` (los PR van a `staging`, no a `main`).
  Eso lo hacemos en el paso 03.

### Opción 2 — Mantener trunk-based actual (más simple, staging no es puerta real)
```text
feature ──PR──▶ main ──(CI aplica a prod)
staging  ← se actualiza manualmente cuando se quiera probar
```
- Merge a `main` → migraciones a prod directo.
- staging recibe migraciones solo si alguien pushea a la rama `staging`.
- No cambia el proceso actual, pero prod no tiene una red de pruebas previa.

> **Mi recomendación: Opción 1.** Es la que cumple "dev→staging→prod" de verdad y
> aprovecha la rama `staging` que ya existe. En ambos casos, los **PR validan**
> contra una DB local efímera sin tocar remotos (seguro).

**El resto del plan asume Opción 1.** Si eliges la 2, solo cambia a qué rama
dispara el deploy (un par de líneas en un workflow).

---

## Arquitectura de la CI (2 workflows)

### A. `db-validate.yml` — en cada PR (NO toca remotos, no necesita secrets)
1. Levanta Supabase local en el runner → **valida que las migraciones aplican limpio**.
2. Regenera tipos (`gen types --local`) y hace `git diff`:
   - si `lib/supabase/types.ts` quedó desincronizado → **falla el PR** con instrucción de regenerar.
3. Esto ata el drift check a la "regla dura": si cambiaste el schema sin regenerar
   tipos (o sin migración), la CI lo caza.

### B. `db-deploy.yml` — al mergear (sí toca remotos, usa secrets)
- push a `staging` → `supabase link` a `gxhq…` + `supabase db push`.
- push a `main` → `supabase link` a `bppg…` + `supabase db push`.

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `.github/workflows/db-validate.yml` | crear (validación en PR) |
| `.github/workflows/db-deploy.yml` | crear (deploy en merge) |
| `lib/supabase/types.ts` | **regenerar** al archivo generado real (629 líneas) |
| `.gitattributes` | crear/añadir `lib/supabase/types.ts eol=lf` (evita falso drift CRLF↔LF entre Windows y el runner Linux) |
| `package.json` | añadir script `"db:types": "supabase gen types typescript --local > lib/supabase/types.ts"` para regenerar fácil |
| `CONTRIBUTING.md` | se actualiza en el **paso 03** (no acá) |

---

## Contenido propuesto

### `.github/workflows/db-validate.yml`
```yaml
name: DB · Validate (PR)
on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
      - 'supabase/config.toml'
      - 'lib/supabase/types.ts'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Start Supabase (aplica migraciones)
        run: pnpm exec supabase start -x studio,imgproxy,edge-runtime,logflare,vector,pooler,realtime,mailpit,storage-api
      - name: Verificar tipos en sync con el schema
        run: |
          pnpm exec supabase gen types typescript --local > lib/supabase/types.ts
          if ! git diff --quiet -- lib/supabase/types.ts; then
            echo "::error::lib/supabase/types.ts está desincronizado. Corré 'pnpm db:types' y commiteá."
            git diff -- lib/supabase/types.ts
            exit 1
          fi
```

### `.github/workflows/db-deploy.yml`
```yaml
name: DB · Deploy migrations
on:
  push:
    branches: [staging, main]
    paths:
      - 'supabase/migrations/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Push a STAGING
        if: github.ref_name == 'staging'
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD_STAGING }}
        run: |
          pnpm exec supabase link --project-ref gxhqvgfasbtctvxhaqoy
          pnpm exec supabase db push

      - name: Push a PROD
        if: github.ref_name == 'main'
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD_PROD }}
        run: |
          pnpm exec supabase link --project-ref bppgwfzzrurlqzfzcpzf
          pnpm exec supabase db push
```

> Los project refs (`gxhq…`, `bppg…`) NO son secretos (ya están en `.mcp.json`),
> por eso van en claro. Las contraseñas y el access token SÍ son secretos.

---

## Lo que necesitas crear tú (secrets de GitHub)

En **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Qué es / dónde sacarlo |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token personal: supabase.com → Account → **Access Tokens** → Generate. Da acceso del CLI a tus proyectos. |
| `SUPABASE_DB_PASSWORD_STAGING` | Dashboard del proyecto **staging** → Settings → Database → Connection/Password (se puede **resetear** si no la tienes). |
| `SUPABASE_DB_PASSWORD_PROD` | Igual, en el proyecto **prod**. ⚠️ Resetear la password de prod rota conexiones existentes que la usen — confírmame antes si hace falta resetearla. |

> Yo NO puedo crear estos secrets (viven en GitHub). Te dejo el checklist y, cuando
> estén, probamos la CI con un PR de prueba.

---

## Cómo lo ejecutaría (con checkpoints)

1. Regenerar `lib/supabase/types.ts` (archivo real) + `.gitattributes` → ⏸ te muestro.
2. Crear los 2 workflows + script `db:types` en `package.json` → ⏸ te muestro.
3. (Tú) crear los 3 secrets en GitHub.
4. Abrir un PR de prueba para ver el workflow de validación en verde → ⏸.
5. Validar el deploy: al mergear, confirmar que `db push` corre sin pendientes
   (no hay migraciones nuevas todavía, así que será un no-op seguro) → ⏸.

---

## Riesgos / mitigaciones

| Riesgo | Mitigación |
|---|---|
| Falso drift de tipos por CRLF↔LF (Windows vs runner Linux) | `.gitattributes` con `eol=lf` para `types.ts` |
| Versión del CLI distinta dev vs CI → output de tipos distinto | CLI pineado como devDep (`supabase` en `package.json`); no auto-actualizar |
| `supabase start` lento en CI (pull de imágenes) | Excluir servicios pesados con `-x`; cachear si hace falta luego |
| `db push` pide password / interactivo | Se pasa `SUPABASE_DB_PASSWORD` por env (no interactivo) |
| Reset de password de prod rompe algo | No reseteo nada sin confirmarte; preferible usar la password existente |

---

## Decisiones a confirmar antes de ejecutar

1. **¿Opción 1 (ramas por entorno) u Opción 2 (trunk-based actual)?** ← la importante.
2. ¿OK con que regenere `lib/supabase/types.ts` al archivo generado real (sin tocar
   imports del código, que siguen usando `@/types`)?
3. ¿Agrego el script `db:types` a `package.json`?

Con tu respuesta a estas 3, ejecuto los pasos 1–2 (archivos) y te dejo el checklist
de secrets para la parte que va en GitHub.
