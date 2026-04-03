@AGENTS.md

# TourGuide — CLAUDE.md

Guia de arquitectura y convenciones para el proyecto TourGuide.
Leela completa antes de tocar cualquier archivo.

---

## Que es TourGuide?

SaaS multi-tenant de WhatsApp bots para agencias de turismo en LATAM.
Cada agencia (organizacion) tiene su propio bot entrenado con sus tours y precios,
un dashboard de conversaciones en tiempo real, chat en vivo donde agentes humanos
pueden tomar el control, y metricas de ROI.

**Stack:**
- Next.js 15 (App Router) + TypeScript
- Supabase (Auth + DB + Realtime + RLS)
- Tailwind CSS + shadcn/ui
- Framer Motion
- Twilio (WhatsApp)
- N8N (motor del bot, hosteado en Railway)
- Stripe (billing)
- Vercel (deploy)

---

## Estructura de carpetas

```
tourguide/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── conversations/
│   │   │   ├── page.tsx               # Lista de conversaciones
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Conversacion individual + chat
│   │   ├── metrics/
│   │   │   └── page.tsx               # Dashboard de ROI
│   │   ├── settings/
│   │   │   ├── page.tsx               # Config de la organizacion
│   │   │   └── agents/
│   │   │       └── page.tsx           # Gestion de agentes
│   │   └── layout.tsx                 # Sidebar + auth guard
│   ├── (marketing)/
│   │   ├── page.tsx                   # Landing page
│   │   └── layout.tsx                 # Layout publico (navbar + footer)
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── twilio/
│   │   │       └── route.ts           # Recibe mensajes entrantes de WhatsApp
│   │   └── conversations/
│   │       └── [id]/
│   │           └── route.ts
│   └── layout.tsx                     # Root layout
│
├── components/
│   ├── ui/                            # Componentes base — SIN logica de negocio
│   ├── chat/
│   │   ├── ChatWindow.tsx             # Contenedor principal del chat
│   │   ├── MessageBubble.tsx          # Burbuja individual (bot / user / agent)
│   │   ├── TypingIndicator.tsx        # Tres puntos animados
│   │   ├── ChatInput.tsx              # Input + boton enviar
│   │   └── TakeControlButton.tsx      # Boton tomar/devolver control al bot
│   ├── conversations/
│   │   ├── ConversationList.tsx       # Lista con realtime
│   │   ├── ConversationItem.tsx       # Fila individual
│   │   └── StatusBadge.tsx            # open | pending | resolved + bot_active
│   ├── metrics/
│   │   ├── MetricCard.tsx             # Numero grande + label
│   │   ├── LeadsChart.tsx             # Grafico de leads por periodo
│   │   └── AfterHoursCard.tsx         # Conversaciones fuera de horario
│   └── layout/
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       └── AuthGuard.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # createBrowserClient
│   │   ├── server.ts                  # createServerClient (Server Components)
│   │   ├── middleware.ts              # createMiddlewareClient
│   │   ├── queries/
│   │   │   ├── conversations.ts       # getConversations, getConversationById
│   │   │   ├── messages.ts            # getMessages, insertMessage
│   │   │   ├── contacts.ts            # getContact, upsertContact
│   │   │   ├── leads.ts              # getLeads, getLeadStats
│   │   │   └── organizations.ts       # getOrg, updateOrgConfig
│   │   └── types.ts                   # Tipos generados de Supabase (supabase gen types)
│   ├── twilio/
│   │   ├── client.ts                  # Instancia del cliente Twilio
│   │   └── sendMessage.ts             # Enviar mensaje por WhatsApp
│   ├── n8n/
│   │   └── pauseBot.ts               # Cambia status en Supabase para pausar N8N
│   └── utils.ts                       # cn(), formatDate(), formatPhone()
│
├── hooks/
│   ├── useConversations.ts            # Lista con suscripcion Realtime
│   ├── useMessages.ts                 # Mensajes con suscripcion Realtime
│   ├── useAuth.ts                     # Session + org_id + role
│   └── useMetrics.ts                  # Stats de ROI con periodo seleccionable
│
├── types/
│   └── index.ts                       # Tipos globales del dominio
│
├── middleware.ts                       # Proteccion de rutas + auth
└── CLAUDE.md                          # Este archivo
```

---

## Tipos globales

```typescript
// types/index.ts

export type Role = 'admin' | 'agent'
export type ConversationStatus = 'open' | 'resolved' | 'pending'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type MessageRole = 'user' | 'assistant' | 'agent'
export type PlanType = 'starter' | 'growth' | 'pro'
export type OrgStatus = 'active' | 'inactive' | 'suspended'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface Organization {
  id: string
  name: string
  slug: string
  prompt: string | null
  faqs: FAQ[]
  bot_config: BotConfig
  plan: PlanType
  status: OrgStatus
  created_at: string
  updated_at: string
}

export interface BotConfig {
  buffer_seconds?: number
  default_lang?: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  org_id: string
  phone: string
  name: string | null
  channel: string            // default: 'whatsapp'
  custom_attributes: Record<string, unknown>
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  org_id: string
  contact_id: string
  status: ConversationStatus
  bot_active: boolean        // false cuando un agente tomo control. N8N verifica esto.
  assigned_agent_id: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole          // 'user' = cliente, 'assistant' = bot, 'agent' = agente humano
  content: string
  from_bot: boolean          // filtra mensajes del bot vs agentes humanos en dashboard
  channel: string            // default: 'whatsapp'
  created_at: string
}

export interface Lead {
  id: string
  org_id: string
  contact_id: string
  conversation_id: string | null
  tour_interest: string | null
  status: LeadStatus
  metadata: Record<string, unknown>  // {dates, group_size, special_needs, ...}
  created_at: string
  updated_at: string
}

export interface TwilioNumber {
  id: string
  phone_number: string       // formato E.164
  twilio_sid: string
  org_id: string | null      // null = en pool, disponible para asignar
  status: OrgStatus
  assigned_at: string | null
  created_at: string
}

export interface Subscription {
  id: string
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanType
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
  updated_at: string
}
```

---

## Reglas de arquitectura — LEER ANTES DE ESCRIBIR CODIGO

### 1. Separacion estricta de capas

| Capa | Responsabilidad | NO puede hacer |
|------|----------------|----------------|
| `components/ui/` | Renderizar UI, aceptar props | Llamar a Supabase, logica de negocio |
| `components/chat/`, `components/conversations/` | Componer UI del dominio | Llamar a Supabase directamente |
| `hooks/` | Fetch, Realtime, estado local | Renderizar JSX |
| `lib/supabase/queries/` | Queries tipadas a Supabase | Logica de UI |
| `app/(dashboard)/*/page.tsx` | Server Components, pasar data a componentes | Logica de negocio compleja |
| `app/api/` | API Routes, webhooks externos | Renderizar UI |

### 2. Supabase — reglas

- **Nunca** importar el cliente de Supabase directamente en un componente. Usar `lib/supabase/queries/`.
- Server Components -> `lib/supabase/server.ts`
- Client Components / hooks -> `lib/supabase/client.ts`
- Webhooks / API Routes -> `lib/supabase/server.ts` con service role solo cuando sea necesario
- **Siempre** tipar las respuestas con los tipos generados (`supabase gen types typescript`)
- **Nunca** hacer `.select('*')` — seleccionar solo las columnas que se usan

### 3. Realtime — patron estandar

```typescript
// hooks/useConversations.ts — patron a seguir para TODOS los hooks de realtime
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Conversation } from '@/types'

export function useConversations(orgId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Carga inicial
    supabase
      .from('conversations')
      .select('id, contact_id, status, bot_active, assigned_agent_id, last_message_at, updated_at')
      .order('last_message_at', { ascending: false })
      .then(({ data }) => {
        if (data) setConversations(data)
      })

    // Suscripcion realtime
    const channel = supabase
      .channel(`conversations:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as Conversation, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new as Conversation : c)
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  return conversations
}
```

### 4. Auth y roles

- El middleware (`middleware.ts`) protege todas las rutas de `/dashboard/*`
- El `org_id` y `role` del usuario se leen desde la tabla `users` al hacer login y se guardan en la sesion
- **Nunca** confiar en el `role` del lado cliente para logica critica — validar en Server Component o API Route
- Los admins ven metricas y settings. Los agentes solo ven conversaciones.

```typescript
// middleware.ts — patron base
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { supabase, response } = createMiddlewareClient(req)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### 5. Webhook de Twilio

```
POST /api/webhooks/twilio
```

- Validar firma de Twilio SIEMPRE (`validateRequest` del SDK)
- Identificar la organizacion por el campo `To` (numero destino) via tabla `twilio_numbers`
- Buscar o crear el contacto en `contacts` (upsert por org_id + phone)
- Buscar o crear la conversacion en `conversations` (por contact_id)
- Insertar el mensaje en `messages`
- Si `conversation.bot_active === true`, dejar que N8N procese
- Si `conversation.bot_active === false`, notificar al agente via Realtime (automatico)
- Responder con TwiML vacio `<Response/>` inmediatamente — no bloquear el webhook

### 6. Control del bot (N8N)

N8N lee `bot_active` de la conversacion antes de responder:

```
if conversation.bot_active === false -> N8N no responde
```

Para pausar el bot desde el dashboard:
```typescript
// lib/n8n/pauseBot.ts
export async function takeControl(conversationId: string, agentId: string) {
  const supabase = createClient()
  await supabase
    .from('conversations')
    .update({ bot_active: false, assigned_agent_id: agentId, status: 'open' })
    .eq('id', conversationId)
}

export async function returnToBot(conversationId: string) {
  const supabase = createClient()
  await supabase
    .from('conversations')
    .update({ bot_active: true, assigned_agent_id: null })
    .eq('id', conversationId)
}
```

### 7. Metricas de ROI — queries clave

```typescript
// lib/supabase/queries/leads.ts

export async function getLeadStats(orgId: string, from: Date, to: Date) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('leads')
    .select('status, metadata, created_at')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
  return data
}
```

> **Nota:** `is_after_hours` no existe como columna en la DB.
> Las metricas de fuera de horario se calculan comparando `last_message_at`
> contra `organizations.bot_config.business_hours` en el servidor.

---

## Convenciones de codigo

### Naming
- Componentes: `PascalCase` — `ConversationList.tsx`
- Hooks: `camelCase` con prefijo `use` — `useConversations.ts`
- Queries / utils: `camelCase` — `getConversations.ts`
- Tipos: `PascalCase` — `Conversation`, `Lead`
- Variables de entorno: `SCREAMING_SNAKE_CASE` en `.env.local`

### Componentes
- Server Component por defecto. Agregar `'use client'` solo cuando sea necesario (interactividad, hooks, Realtime)
- Props siempre tipadas con `interface`, no `type` para componentes
- No pasar el cliente de Supabase como prop — cada componente lo instancia desde `lib/`

### Errores
- Las queries de Supabase siempre manejan `error`: `const { data, error } = await supabase...`
- Los webhooks siempre responden 200 aunque fallen internamente (Twilio reintenta en 4xx/5xx)
- Loggear errores criticos — en produccion usar Sentry o similar

### Variables de entorno requeridas
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Solo en API Routes, nunca en cliente
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WEBHOOK_SECRET=
N8N_WEBHOOK_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Seguridad — checklist

- [ ] RLS activado en todas las tablas
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca en codigo cliente ni en `NEXT_PUBLIC_`
- [ ] Firma de Twilio validada en el webhook
- [ ] Middleware protegiendo todas las rutas de `/dashboard`
- [ ] Rate limiting en `/api/webhooks/twilio` (Vercel Edge Config o Upstash)
- [ ] Inputs sanitizados antes de insertar en DB
- [ ] Stripe webhook validado con `stripe.webhooks.constructEvent`

---

## Escala — decisiones de diseno

| Decision | Razon |
|----------|-------|
| RLS en Supabase en lugar de filtros manuales | Aislamiento de datos garantizado a nivel DB, no codigo |
| Indices en `org_id + created_at` | Queries paginadas rapidas sin importar el volumen total |
| Realtime filtrado por canal `conversations:{orgId}` | Cada org solo recibe sus eventos, no hay flood global |
| N8N lee `bot_active` desde DB en lugar de recibir senales | Sin estado en memoria, escala horizontalmente |
| Webhook de Twilio responde inmediato + procesa async | Twilio tiene timeout de 15s, no podemos bloquear |
| Server Components para el dashboard inicial | Carga inicial rapida, datos frescos sin waterfall de fetch |

---

## Comandos utiles

```bash
# Instalar dependencias core
npm install @supabase/supabase-js @supabase/ssr framer-motion twilio stripe

# shadcn/ui
npx shadcn@latest init

# Generar tipos de Supabase (correr cada vez que cambie el schema)
npx supabase gen types typescript --project-id TU_PROJECT_ID > lib/supabase/types.ts

# Dev
npm run dev
```
