# WhatsApp Embedded Signup — Guía para salir en vivo

> Runbook para completar la integración de WhatsApp (Meta Cloud API + Embedded Signup)
> y habilitar el onboarding de clientes. Marcá `[x]` lo que vayas completando.

## Estado actual

- ✅ **Código completo.** Embedded Signup, conexión manual, webhook, envío/recepción, token central.
  - Arquitectura: **Modelo B** — un System User token central (`META_SYSTEM_USER_TOKEN`) opera
    todos los tenants. El token del cliente NO se persiste (solo se usa al conectar).
  - Helpers: `lib/whatsapp/token.ts` (`getMessagingToken`), `registerPhoneNumber` en `lib/whatsapp/client.ts`.
- ✅ **Variables de entorno cargadas** en `.env.local`: `NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`,
  `META_WEBHOOK_VERIFY_TOKEN`, `NEXT_PUBLIC_META_CONFIG_ID`, `META_SYSTEM_USER_TOKEN`, `META_DEFAULT_WABA_PIN`.
- ✅ **Verificación de empresa** (Business Verification) en Meta.
- ✅ **Páginas legales creadas:** `/privacy` y `/data-deletion` (bilingües, email `naia@naiaautomate.com`).
- ✅ **Favicon del sitio** (`app/icon.svg`, marca TourGuide).
- ❌ **BLOQUEADO:** Embedded Signup da *"only available for BSPs or TPs"* → falta pasar **App Review**
  (Acceso Avanzado a `whatsapp_business_messaging` + `whatsapp_business_management`).

El código no cambia. Lo que falta es **deploy** + **configuración en Meta** + **2 videos** + **App Review**.

### Qué falta (resumen rápido)
1. **Deploy a producción** (Vercel) → para tener URLs públicas (`/privacy`, `/data-deletion`).
2. En Meta (Settings → Basic): **ícono PNG 1024×1024**, nombre, categoría, y cargar las 2 URLs.
3. Probar el pipeline (conexión manual + ngrok) y **grabar Video 1**.
4. **Grabar Video 2** (crear plantilla en WhatsApp Manager).
5. Enviar **App Review** ("Incorporación sin socio").

> Razón social cargada en `/privacy`: **3-102-943883 Sociedad de Responsabilidad Limitada**
> (nombre comercial: TourGuide). Conviene un repaso legal humano antes de producción.

---

## Fase 1 — Preparar los assets que pide App Review

> Meta ahora revisa la app **completa** y **no se puede editar ni cancelar** una vez enviada.
> Tené TODO esto listo antes de darle "Enviar".

- [x] **1.1 Página de Política de privacidad** (`/privacy`) — ✅ creada, bilingüe, email + razón social
  cargados (`3-102-943883 S.R.L.`). Falta solo un repaso legal humano antes de producción.
- [x] **1.2 Página de eliminación de datos** (`/data-deletion`) — ✅ creada, bilingüe, email cargado.
- [ ] **1.3 Deploy a producción** (Vercel) — *bloquea 1.4*. Las URLs y la app deben ser públicas.
- [ ] **1.4 Cargar ambas URLs** en Meta → App → **Settings → Basic**:
  - Privacy Policy URL → `https://<dominio>/privacy`
  - User Data Deletion → URL de instrucciones → `https://<dominio>/data-deletion`
- [ ] **1.5 Ícono de la app (Meta):** PNG cuadrado **1024×1024** (≠ favicon; Meta no acepta SVG/ICO).
  El favicon del sitio ya está en `app/icon.svg`; falta exportar ese diseño a PNG para Meta.
- [ ] **1.6 Nombre para mostrar** y **categoría** de la app (Settings → Basic).

> ⚠️ Las URLs deben ser **públicas** (no localhost) → por eso el deploy (1.3) va primero.

---

## Fase 2 — Probar el pipeline end-to-end (sin depender del TP)

> Esto valida que recibir/enviar funciona **y** te genera el material para el Video 1 de App Review.
> No necesita Embedded Signup ni estatus de Tech Provider.

- [ ] **2.1 Servir en HTTPS** (Facebook bloquea `FB.login` en http, y conviene para probar):
  ```bash
  kill <PID-del-dev-server-http>   # si hay uno corriendo en http
  npx next dev --experimental-https
  ```
  Abrir `https://localhost:3000` (aceptar el certificado self-signed).

- [ ] **2.2 Levantar túnel público** para el webhook:
  ```bash
  ngrok http 3000
  ```
  Copiar la URL `https://xxxx.ngrok.app`.

- [ ] **2.3 Configurar el webhook en Meta** → App → **WhatsApp → Configuration → Webhook**:
  - Callback URL: `https://xxxx.ngrok.app/api/webhooks/whatsapp`
  - Verify token: el valor de `META_WEBHOOK_VERIFY_TOKEN`
  - **Suscribir el campo `messages`**.

- [ ] **2.4 Conectar el número de prueba (manual):**
  - Meta → App → **WhatsApp → API Setup** → copiar **Phone Number ID**, **WABA ID** y **token temporal**.
  - TourGuide → `/settings/whatsapp` → **"Connect manually (advanced)"** → pegar los 3 valores → Connect.

- [ ] **2.5 Probar RECEPCIÓN:** mandar un WhatsApp desde un teléfono al número de prueba →
  verificar que aparece la conversación en `/conversations`.

- [ ] **2.6 Probar ENVÍO:** abrir la conversación → "tomar control" → responder →
  verificar que el mensaje llega al teléfono.

---

## Fase 3 — Grabar los videos de App Review

- [ ] **3.1 Video 1 — enviar un mensaje.** Grabar pantalla de:
  - el cURL de **API Setup** enviando un mensaje a tu número de destinatario de prueba, **o**
  - el envío desde el dashboard de TourGuide (paso 2.6).
- [ ] **3.2 Video 2 — crear una plantilla.** Grabar el **WhatsApp Manager** creando una plantilla
  de mensaje.

---

## Fase 4 — Enviar App Review (convertirse en Tech Provider)

Ruta: App Dashboard → **Casos de uso → Personalizar** (WhatsApp) → **"Incorporación de proveedores de tecnología"**.

- [ ] **4.1 Paso 1 — Verificación de empresa:** ya está ✅ (marcado completo).
- [ ] **4.2 Paso 2 — Revisión de la aplicación:**
  - [ ] Revisar configuración de la app (Fase 1).
  - [ ] Adjuntar descripción de uso + video por cada permiso:
    - `whatsapp_business_messaging`
    - `whatsapp_business_management`
  - [ ] Subir documentación.
- [ ] **4.3 Elegir "Incorporación sin socio"** (botón al final de la página).
- [ ] **4.4 Click en "Iniciar revisión de la aplicación"** → esperar aprobación (días).

---

## Fase 5 — Post-aprobación (Embedded Signup en vivo)

- [ ] **5.1 Verificar la config de Embedded Signup** (Facebook Login for Business → Configurations →
  `TourGuide Embed Config`): caso de uso *WhatsApp Embedded Signup*, WhatsApp Cloud API,
  token expiration *Never*.
- [ ] **5.2 Confirmar `NEXT_PUBLIC_META_CONFIG_ID`** apunta a esa config (ya cargado: `994438589974074`).
- [ ] **5.3 Probar el botón "Connect with Facebook"** en `/onboarding` y `/settings/whatsapp`
  con un número real (ya no da el error de BSP/TP).
- [ ] **5.4 Webhook de producción:** reconfigurar el Callback URL con el dominio de producción
  (no ngrok) y resuscribir el campo `messages`.
- [ ] **5.5 Facturación:** definir el flujo de tarjeta de crédito de los clientes onboarded
  (cada cliente agrega su tarjeta a la cuenta en la plataforma de WhatsApp Business).

---

## Notas técnicas

- `FB.login` requiere **HTTPS** (no funciona en `http://localhost`).
- El webhook necesita una **URL pública** (Meta no llega a localhost) → ngrok en dev, dominio en prod.
- Versión de Graph API: el código usa `v21.0` de forma consistente; el ejemplo de Meta usa `v25.0`.
  Ambas funcionan; eventualmente conviene unificar a una versión más nueva.
- Mientras la app está en **modo prototipo** (pre-App Review), solo se pueden onboardear
  **usuarios agregados a mano** en *App Roles → Roles*.

## Referencias
- [Convertirse en proveedor de tecnología (Meta)](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers/)
- Plan de implementación del código: `~/.claude/plans/structured-chasing-sky.md`
