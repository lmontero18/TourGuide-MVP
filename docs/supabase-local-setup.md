# Supabase Local — Guía de instalación (TourGuide)

Cómo levantar un Supabase completo en tu máquina (Windows o Mac) para desarrollar sin tocar producción.

Supabase local **no es solo Postgres** — es toda la plataforma (Auth, REST, Realtime, Storage, Studio) corriendo en contenedores Docker, idéntica a la nube. Esto da paridad dev ↔ prod.

> A lo largo de la guía: 🍎 = Mac, 🪟 = Windows. Donde no hay ícono, aplica a ambos.

---

## 0. Prerequisitos

| Herramienta | Por qué |
|---|---|
| **Docker Desktop** | Supabase local corre todo en contenedores |
| **Node ≤ 24** | El CLI de Supabase no soporta Node 25+ |
| **pnpm** (vía corepack) | Gestor de paquetes del proyecto |
| **Git** | Clonar el repo |

### 🍎 Mac

```bash
# Docker Desktop
brew install --cask docker        # o descargar de docker.com
# abrir Docker Desktop una vez y esperar a que diga "Running"

# Node 24 (convive con tu Node default)
brew install node@24

# pnpm
corepack enable
```

### 🪟 Windows

1. **WSL2** (Docker Desktop lo necesita). En PowerShell **como Administrador**:
   ```powershell
   wsl --install
   ```
   Reiniciar la PC.

2. **Docker Desktop**: descargar de https://www.docker.com/products/docker-desktop/ → instalar → en Settings dejar activado **"Use WSL 2 based engine"**. Abrirlo y esperar a que diga "Running".

3. **Node 24** vía nvm-windows (https://github.com/coreybutler/nvm-windows/releases):
   ```powershell
   nvm install 24
   nvm use 24
   node -v        # debe decir v24.x
   ```

4. **pnpm**:
   ```powershell
   corepack enable
   ```

> 🪟 Importante: en Windows hacé `nvm use 24` y trabajá en esa terminal. Así no hace falta ningún prefijo raro de PATH — el `node` activo ya es el 24.

---

## 1. Clonar el proyecto e instalar deps

```bash
git clone <repo>
cd tourguide
pnpm install
```

El CLI de Supabase ya viene como dependencia del proyecto (`package.json` → `"supabase": "^2.107.0"`). Se invoca con `pnpm dlx supabase ...` — no hace falta instalarlo global.

---

## 2. Levantar el stack local

Con Docker Desktop abierto:

### 🍎 Mac (Node default es 25, hay que forzar el 24 para el CLI)

```bash
PATH="/opt/homebrew/opt/node@24/bin:$PATH" pnpm dlx supabase start
```

### 🪟 Windows (ya estás en Node 24 por `nvm use 24`)

```powershell
pnpm dlx supabase start
```

La **primera vez** descarga ~10 imágenes Docker (tarda unos minutos). Las siguientes son instantáneas.

Al terminar imprime las URLs y llaves:

```
API URL:        http://127.0.0.1:54321
DB URL:         postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:     http://127.0.0.1:54323
Mailpit URL:    http://127.0.0.1:54324   (acá caen los emails de confirmación)
Publishable key: sb_publishable_...
Secret key:      sb_secret_...
```

Para volver a ver estas llaves:

```bash
# 🍎 Mac
PATH="/opt/homebrew/opt/node@24/bin:$PATH" pnpm dlx supabase status
# 🪟 Windows
pnpm dlx supabase status
```

---

## 3. Conectar el frontend al Supabase local

Crear `.env.local` en la raíz del proyecto con las llaves del paso anterior:

```bash
# === Supabase LOCAL ===
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # = "Publishable key" del status
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...            # = "Secret key" del status
```

> `.env.local` está en `.gitignore` — **nunca** se commitea. Cada quien arma el suyo.

> Las llaves locales de Supabase son defaults públicos de demo (seguras de compartir). Las de OpenAI / Meta / Stripe son secretos reales — pedímelas por canal privado, no van al repo.

> 🪟 En Windows usá un editor (VS Code) para crear el archivo `.env.local`. El Explorador a veces oculta extensiones y lo guarda como `.env.local.txt` — verificá que el nombre sea exacto.

---

## 4. Cargar el schema (migraciones)

El schema vive en `supabase/migrations/`. Se aplica al hacer reset:

```bash
# 🍎 Mac
PATH="/opt/homebrew/opt/node@24/bin:$PATH" pnpm dlx supabase db reset
# 🪟 Windows
pnpm dlx supabase db reset
```

Esto recrea la DB local desde cero y corre **todas** las migraciones en orden:

- `2026..._remote_schema.sql` — schema base (organizations, users, conversations, messages, leads, etc.)
- `2026..._auth_user_trigger.sql` — trigger `handle_new_user()` que crea el row en `public.users` al registrarse

---

## 5. Arrancar la app

```bash
pnpm dev
```

Abrí http://localhost:3000 → registrate. El email de confirmación **no** sale a internet — cae en Mailpit: http://127.0.0.1:54324

Si el login funciona, la conexión local ↔ local está OK.

---

## Comandos del día a día

🍎 **Mac** — el CLI necesita Node 24, prefijá cada comando (o ponelo en un alias):

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # una vez por terminal
pnpm dlx supabase start     # levantar stack
pnpm dlx supabase stop      # apagar (libera RAM)
pnpm dlx supabase status    # ver URLs y llaves
pnpm dlx supabase db reset  # recrear DB desde migraciones
```

🪟 **Windows** — primero `nvm use 24` en la terminal, después:

```powershell
pnpm dlx supabase start
pnpm dlx supabase stop
pnpm dlx supabase status
pnpm dlx supabase db reset
```

UIs (igual en ambos):
- **Studio** (panel tipo dashboard) → http://127.0.0.1:54323
- **Mailpit** (emails de prueba) → http://127.0.0.1:54324

---

## Los contenedores (qué es cada uno)

| Contenedor | Qué hace |
|---|---|
| `supabase_db` | Postgres — la DB real, único con tus datos |
| `supabase_kong` | API Gateway — puerta única en `:54321`, rutea a cada servicio |
| `supabase_auth` | Auth (GoTrue) — signup, login, JWT, OTP |
| `supabase_rest` | PostgREST — convierte tablas en API REST automática |
| `supabase_realtime` | WebSockets — emite cambios de Postgres (chat en vivo) |
| `supabase_storage` | Archivos / buckets |
| `supabase_studio` | El panel web (`:54323`) |
| `supabase_meta` | API interna que usa Studio para gestionar Postgres |
| `supabase_analytics` / `vector` | Logs centralizados |
| `supabase_edge_runtime` | Edge Functions (Deno) |
| `imgproxy` / `pooler` | Apagados en `config.toml` — no se usan |

Para arrancar más rápido y usar menos RAM, apagá lo que no uses en `supabase/config.toml`:

```toml
[storage]
enabled = false
[edge_runtime]
enabled = false
[analytics]
enabled = false
```

---

## Troubleshooting

| Problema | Causa / Fix |
|---|---|
| `Cannot connect to the Docker daemon` | Docker Desktop no está abierto. Abrilo y esperá a "Running". |
| 🪟 `docker` no funciona en la terminal | WSL2 mal instalado o Docker sin "Use WSL 2 based engine". Revisá Settings de Docker. |
| El CLI tira error raro de Node | 🍎 Estás en Node 25+ → usá el prefijo de PATH. 🪟 Olvidaste `nvm use 24`. |
| Puerto `54321` ocupado | Otro `supabase start` corriendo. `pnpm dlx supabase stop` primero. |
| Cambié el schema y no se refleja | `pnpm dlx supabase db reset` para re-aplicar migraciones. |
| El email de confirmación no llega | Es local — mirá Mailpit en `:54324`, no tu inbox real. |
| 🪟 Se creó `.env.local.txt` | El Explorador agregó `.txt`. Renombralo a `.env.local` exacto. |
