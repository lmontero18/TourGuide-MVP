# Observabilidad y monitoreo (M6 · CODE-149)

> Objetivo: enterarse de los problemas por una alerta, no por un cliente molesto.
> Si el bot deja de responder a las 3am, suena una alerta antes de que un cliente lo note.

## Mapa de la infraestructura monitoreada

| Servicio | Dónde corre | Qué lo vigila |
|---|---|---|
| App Next.js (webhook, dashboard, API) | Vercel | Sentry (errores) + BetterStack (`/api/health`, webhook) |
| Postgres / Auth / Realtime / Storage | Supabase | `/api/health` (query mínima) + dashboard de Supabase |
| N8N (motor del bot) | Hostinger (`naia.naiaautomate.com`) | BetterStack (monitor HTTP directo) |
| Cron `cleanup-media` (diario 06:00 UTC) | Vercel Cron | Heartbeat BetterStack |
| Backup diario DB→R2 (09:00 UTC) | GitHub Actions | Heartbeat BetterStack |

> Nota: el ticket original menciona "workers en Railway" — no existen. El único
> proceso fuera de Vercel es N8N en Hostinger.

## Dónde mirar (dashboard de salud)

- **Errores de la app** → [Sentry Issues](https://sentry.io) — agrupados, con tag `org_id` para filtrar por tenant.
- **Logs** → Vercel → proyecto → **Observability → Logs**. Filtrar por tenant con `org_id:<uuid>`, por ruta con `route:webhooks/whatsapp`.
- **Uptime / alertas** → [BetterStack Uptime](https://uptime.betterstack.com) — monitores y heartbeats.
- **DB** → Supabase Dashboard → **Reports** (CPU, conexiones, disco) y **Logs** (Postgres, Auth, Realtime). Revisar también **Advisors**.
- **Deploys / funciones** → Vercel → **Deployments** y **Observability → Functions** (errores 5xx, duración, cold starts).

## Logging estructurado

Toda API route y webhook usa `lib/logger.ts` (no `console.*` directo):

```ts
import { createLogger } from '@/lib/logger'
const log = createLogger({ route: 'mi-ruta' })
const orgLog = log.child({ org_id })          // hereda bindings
orgLog.error('algo fallo', { error, conversation_id })
```

- En producción emite **una línea JSON** por evento → Vercel la indexa y permite filtrar por campo.
- En dev emite formato legible.
- `debug` se suprime en prod salvo `LOG_LEVEL=debug`.
- Siempre incluir `org_id` en cuanto se conozca — es el filtro por tenant.

## Sentry

- SDK: `@sentry/nextjs` (>= 10.13.0, requerido por Turbopack/Next 16).
- Init: `instrumentation.ts` (server/edge) + `instrumentation-client.ts` (browser). Los `sentry.client.config.ts` legacy no funcionan con Turbopack.
- `onRequestError` captura errores no manejados de rutas/RSC/proxy. Los errores dentro de `after()` del webhook se capturan manualmente (`Sentry.captureException` + `flush`).
- `beforeSend` filtra `ImportUserError` (errores operacionales esperados).
- `tracesSampleRate: 0` — solo error tracking en M6 (cuida el free tier de 5k errores/mes).
- Eventos del browser salen por `/sentry-tunnel` (evita ad-blockers).

### Variables de entorno

| Var | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` + Vercel (todos los envs) | Destino de eventos |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Vercel (build) | Upload de source maps |
| `SENTRY_AUTH_TOKEN` | Vercel (build, sensitive) | Upload de source maps (o usar la integración Sentry↔Vercel) |
| `BETTERSTACK_HEARTBEAT_CLEANUP_MEDIA` | Vercel (prod) | Heartbeat del cron |
| `BETTERSTACK_HEARTBEAT_DB_BACKUP` | GitHub Actions secret | Heartbeat del backup |

Sin `SENTRY_AUTH_TOKEN` el build local pasa igual (solo no sube source maps).
Sin DSN, Sentry queda desactivado (además `enabled` exige `NODE_ENV=production`).

## Checklist de configuración externa (manual, una sola vez)

### Sentry (sentry.io)

- [ ] Crear proyecto tipo **Next.js** → copiar el DSN.
- [ ] Instalar la integración **Sentry ↔ Vercel** (setea `SENTRY_AUTH_TOKEN` sola) o crear un Auth Token con scope `project:releases` + `org:read`.
- [ ] Cargar env vars en Vercel (tabla de arriba).
- [ ] **Alerts** → regla "A new issue is created" → acción **Email** al equipo. Probar con "Send Test Notification".

### BetterStack (uptime.betterstack.com)

- [ ] Monitor HTTP → `https://<dominio-prod>/api/health` — esperar **200**, check cada 1 min, alerta por email.
- [ ] Monitor HTTP → `https://<dominio-prod>/api/webhooks/whatsapp` (GET) — **expected status 403** (la ruta viva rechaza GETs sin challenge; si deja de responder 403, está caída).
- [ ] Monitor HTTP → `https://naia.naiaautomate.com/healthz` — esperar **200**. ⚠️ Verificar primero con `curl -i`; si el reverse proxy de Hostinger no enruta `/healthz`, monitorear la raíz del host.
- [ ] Heartbeat **cleanup-media** — período 24h, gracia 1h → copiar URL a env `BETTERSTACK_HEARTBEAT_CLEANUP_MEDIA` en Vercel (prod).
- [ ] Heartbeat **db-backup** — período 24h, gracia 2h → GitHub secret `BETTERSTACK_HEARTBEAT_DB_BACKUP`.
- [ ] Configurar el email de on-call.

## Qué significa cada alerta y primer paso

| Alerta | Significa | Primer paso |
|---|---|---|
| Monitor `/api/health` caído | App caída o DB inaccesible | Vercel → Deployments (¿deploy roto?) → Supabase status |
| Monitor webhook ≠ 403 | Ruta del webhook caída — Meta no puede entregar mensajes | Vercel → Functions → logs de `webhooks/whatsapp` |
| Monitor N8N caído | El bot no responde a nadie | Panel de Hostinger / reiniciar N8N |
| Heartbeat cleanup-media sin ping | El cron falló o no corrió | Vercel → Logs `route:cron/cleanup-media` + Sentry |
| Heartbeat db-backup sin ping | Backup diario falló | GitHub → Actions → "DB · Backup externo (R2)" |
| Email de Sentry (issue nuevo) | Error nuevo en la app | Abrir el issue — trae stack, `org_id`, ruta |

## Cómo simular fallos (verificación)

- **Health**: `curl -i localhost:3000/api/health` → 200. Con Supabase local apagado (`supabase stop`) → 503 sin detalles internos.
- **Sentry en dev**: poner `enabled: true` + `debug: true` temporalmente en `sentry.server.config.ts`, lanzar `throw new Error('test')` en una ruta → ver el evento en Sentry Issues.
- **Webhook**: POST con firma HMAC válida (calcular `x-hub-signature-256` con `META_APP_SECRET`) y un `phone_number_id` inexistente → log `warn` con el phone_number_id.
- **internal/***: `curl -X POST -H "Authorization: Bearer $N8N_INTERNAL_SECRET" -H 'Content-Type: application/json' -d '{"conversation_id":"<uuid-inexistente>","content":"x"}' localhost:3000/api/internal/save-bot-reply` → 404.
- **Heartbeat**: apuntar `BETTERSTACK_HEARTBEAT_CLEANUP_MEDIA` a webhook.site y correr el cron con `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/cleanup-media`.
- **Backup**: correr el workflow por `workflow_dispatch` y ver el check del heartbeat en BetterStack.

## Fuera de alcance de M6 (pendientes conocidos)

- **Stripe / alertas de pago** — no existe integración de billing aún.
- **Slack** — decisión: alertas solo por email.
- **Alerta anti-loop** (>3000 respuestas/día por org) y **alerta de spend de OpenAI** — ver `docs/plans.md`; requieren agregación sobre `messages`, no logging.
- **Migración de `console.error` en rutas del dashboard** (~14 sitios no críticos).
- **Tracing / Session Replay de Sentry** — activar cuando haga falta.
- **Manejo del 500 de `internal/*` en el workflow de N8N** — configurar retry/branch de error en N8N (vive en Hostinger).
