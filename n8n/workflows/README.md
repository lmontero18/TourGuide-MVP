# Workflows de N8N — TourGuide

Export versionado de los 3 workflows de TourGuide que viven en la instancia
compartida de N8N de NAIA (`naia.naiaautomate.com`, hosteada en Hostinger).
Esto NO reemplaza a N8N como motor del bot — es respaldo/historial en git de
lo que hoy solo vive en la UI de N8N (ver CODE-148 / M5).

## Archivos

| Archivo | Workflow en N8N (id) | Entorno |
|---|---|---|
| `dev.json` | TourGuide - Parametrizado - Dev (`rHdzyZnv3AZym4XM`) | dev |
| `stage.json` | TourGuide - Parametrizado - Stage (`QKEmxVTUKY5IDmSk`) | staging |
| `prod.json` | TourGuide - Parametrizado - Prod (`Kfb6Oo8rTdYG4wIV`) | prod — **activo** |

## Cómo exportar (manual, desde la UI de N8N)

1. Abrir el workflow en `naia.naiaautomate.com`.
2. Menú (`⋮`) → **Download** (exporta el JSON del workflow completo).
3. Guardar el archivo acá con el nombre de la tabla de arriba (sobrescribir).
4. Commitear el cambio — así queda el historial de versiones en git, no solo
   en el historial interno de N8N.

## Actualizar

No hay automatización todavía (la API de N8N/credenciales de exportación no
están conectadas a CI). Cuando se edite un workflow en la UI, repetir los
pasos de arriba y commitear el JSON actualizado — es un paso manual por
ahora, a criterio del que edita.

> **Antes de commitear un export nuevo**, revisar que no traiga `pinData`
> (datos de ejemplo pineados en n8n para debug). Los exports originales de
> este repo traían un `pinData` con datos reales de OTRO cliente de NAIA
> (nombre, telefono, audio privado) — se limpió antes del primer commit. Si
> el próximo export vuelve a traer algo ahí, quitarlo antes de subir.

## Qué hace (los 3 son idénticos en lógica — solo cambian credenciales/paths por entorno)

1. **Webhook** (trigger) — recibe `POST` desde la app con: `org_id`,
   `contact_phone`, `conversation_id`, `message`, `phone_number_id`,
   `access_token`, `callback_base_url`, `n8n_secret`, `system_prompt`.
2. **Buffer de mensajes (Redis/Upstash)** — agrupa mensajes en ráfaga
   (ventana de 15s) antes de procesarlos, para no responder mensaje por
   mensaje cuando el cliente escribe varios seguidos.
3. **AI Agent** (OpenAI `gpt-5-mini` vía Langchain):
   - **Postgres Chat Memory** — historial de conversación, keyed por `conversation_id`.
   - **Supabase Vector Store** (tabla `embeddings`) — RAG sobre tours/precios/itinerarios.
   - **Tool `transfer_to_human`** — `POST {callback_base_url}/api/internal/bot-control`
     con `Authorization: Bearer {n8n_secret}` → desactiva el bot (`bot_active = false`)
     cuando el cliente pide hablar con un humano. Body: `{ conversation_id }` (requerido;
     404 si la conversación no existe, 401 si el secret no matchea).
4. **Send MSG** — `POST` directo a Meta Graph API
   (`graph.facebook.com/v21.0/{phone_number_id}/messages`) con el `access_token` de la org.
5. **Save bot reply** — `POST {callback_base_url}/api/internal/save-bot-reply`
   con `Authorization: Bearer {n8n_secret}` → persiste la respuesta del bot en `public.messages`.
   Body: `{ conversation_id, content }` (ambos requeridos; 400 si falta alguno,
   404 si la conversación no existe).

## Contrato con la app (TourGuide)

| Dato | De dónde sale | Para qué |
|---|---|---|
| `n8n_secret` | Recibido en el payload del webhook; su valor es `N8N_INTERNAL_SECRET` de la app | Autentica las llamadas de N8N hacia `/api/internal/*` |
| `callback_base_url` | Recibido en el payload | Base URL de la app según el entorno (evita hardcodear localhost/staging/prod en N8N) |
| `phone_number_id` / `access_token` | Recibido en el payload (viene de `whatsapp_accounts`) | Enviar el mensaje directo a Meta Graph API |

## Diferencias reales entre dev/stage/prod

Solo cambian: el `path` del Webhook, las credenciales de OpenAI
(`Tourguide OpenAI Dev` / `Staging` / `Prod`), y el estado `active` (solo
Prod está activo). **Redis (Upstash) y Postgres (chat memory) son la MISMA
instancia/credencial en los 3** — no hay aislamiento de datos ahí entre
entornos, solo de credenciales de OpenAI y del trigger. Vale la pena saberlo
aunque ya se decidió que la separación por workflow alcanza (ver CODE-148).
