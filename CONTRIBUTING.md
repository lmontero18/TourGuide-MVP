# Contribuir a TourGuide

Cómo trabajamos en el repo. Documento vivo — si el proceso cambia, se actualiza acá y en el doc de metodología en Linear.

## Setup local

Usamos **pnpm** (vía corepack). No uses `npm` ni `yarn` — el único lockfile es `pnpm-lock.yaml` y debe commitearse.

```bash
corepack enable     # una vez; fija la versión de pnpm desde el field packageManager
pnpm install
pnpm dev            # http://localhost:3000
```

## Flujo de trabajo (trunk-based)

`main` = **producción**. Siempre debe estar desplegable.

1. **Toma un issue en Linear** y muévelo a `In Progress` (o créalo si no existe; el trabajo interno vive en Linear).
2. **Crea la rama desde Linear** con "Copy git branch name". El ID del issue va en el nombre → el PR se enlaza y se mueve solo. No crees ramas a mano.
3. Trabaja en commits pequeños. Mantén la rama corta y de una sola tarea.
4. **Abre un PR** contra `main`. Llena la plantilla.
5. CI verde + review de CodeRabbit + 1 review humano → **squash merge**.
6. El merge mueve el issue a `Done` y dispara el deploy a producción en Vercel.

Si algo rompe producción: **se revierte el PR**, no se parchea en caliente.

## Cambios de schema (migraciones)

**Regla dura: el schema solo cambia por migraciones versionadas en git.** Nunca por el dashboard de Supabase. Todo cambio de schema nace como migración en un PR.

Flujo:

1. Levanta el entorno local (ver `docs/supabase-local-setup.md`).
2. Crea la migración:
   - `pnpm dlx supabase migration new <nombre>` y escribe el SQL a mano, **o**
   - haz el cambio en local y genera el diff: `pnpm dlx supabase db diff -f <nombre>`.
3. Aplica y prueba en local: `pnpm dlx supabase db reset` (corre todas las migraciones + el seed).
4. Regenera los tipos y commitéalos: `pnpm db:types` → commit de `lib/supabase/types.ts`. (Si te olvidas, la CI `db-validate` falla.)
5. Abre un PR contra `main`. La CI `db-validate` verifica que las migraciones aplican y que los tipos están en sync.
6. **Probar en staging antes de mergear:** mergea tu rama a `staging` (`git merge` + `git push origin staging`) → `db-deploy` aplica las migraciones a Supabase **staging**.
7. Al mergear el PR a `main` → `db-deploy` aplica a **producción**.

Nunca edites el schema en el dashboard. Si algo se cambió ahí por error, genera la migración que lo refleja (`supabase db diff`) y commitéala para reconciliar.

## Convención de commits y títulos de PR

Usamos [Conventional Commits](https://www.conventionalcommits.org/). El prefijo va en el **título del PR** (y en los commits), no en el nombre de la rama:

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `chore:` mantenimiento, config, deps
- `refactor:`, `docs:`, `test:` cuando aplique

Como hacemos squash merge, el título del PR es lo que queda en el historial de `main`. Que sea claro.

## CodeRabbit

CodeRabbit revisa cada PR automáticamente (está instalado como GitHub App, no necesita configuración extra por PR).

- Genera un resumen del PR y deja comentarios de review.
- **Salta los PRs en draft** — marca el PR como "Ready for review" para que lo revise.
- Plan free: ~4 reviews/hora. Si te pasas, los reviews se encolan.
- Lee `.coderabbit.yaml`, que tiene instrucciones específicas de nuestra arquitectura.

Comandos útiles en los comentarios del PR:
- `@coderabbitai review` — fuerza un nuevo review.
- `@coderabbitai summary` — regenera el resumen.
- `@coderabbitai resolve` — resuelve sus comentarios.
- `@coderabbitai help` — lista de comandos.

CodeRabbit es un **primer filtro**, no reemplaza el review humano. Él caza lo común (tipos, null checks, fugas de secretos); el humano revisa arquitectura, intención y casos de negocio.

## Reglas duras de arquitectura

Estas las revisa CodeRabbit automáticamente, pero conócelas:

- **Nunca** importar el cliente Supabase directo en componentes → usar `lib/supabase/queries/`.
- Server Components → `lib/supabase/server.ts`. Client/hooks → `lib/supabase/client.ts`.
- **Nunca** `.select('*')` — solo las columnas que se usan.
- Siempre tipar con los tipos generados (`supabase gen types`).
- **Webhooks siempre responden 200**, aunque fallen internamente (Meta/Stripe reintentan en 4xx/5xx).
- Validar firmas en webhooks (Meta: HMAC SHA-256; Stripe: `constructEvent`).
- `components/ui/` = render puro, sin Supabase ni lógica de negocio.
- `hooks/` = fetch, Realtime y estado, sin render de JSX.
- `org_id` y `role` se leen siempre desde la tabla `users`, nunca del cliente.
- Cambios de schema **solo vía migraciones** versionadas, nunca en el dashboard de Supabase.
- Nada de secretos en el código ni en variables `NEXT_PUBLIC_` (el `SUPABASE_SERVICE_ROLE_KEY` es solo server).

## Seguridad de entornos

- **Producción es sagrada.** Nunca pruebes contra la DB de producción ni contra números de WhatsApp de clientes reales.
- Usa el entorno de dev/staging para todo lo que no esté listo.

## Next.js 15

Tiene breaking changes (ej. `params`/`searchParams` son async). Ante la duda, consulta `node_modules/next/dist/` antes de escribir código.
