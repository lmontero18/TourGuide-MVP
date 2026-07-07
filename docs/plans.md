# Planes y pricing — TourGuide

> Decisión de julio 2026. Referencia para equipo y para cuando se implemente
> billing (Stripe) y metering. Nada de esto está aplicado en código todavía.

## Principio rector

**El bot nunca deja de responder.** El core del producto es contestar mientras
la agencia duerme y no perder leads — ningún plan corta, limita ni degrada las
respuestas del bot. La diferenciación entre planes va por features que generan
revenue extra, nunca por features que salvan leads.

## Estructura: 1 plan vivo + 1 coming soon

### TourGuide — $500 USD/mes (vivo)

- Bot 24/7, respuestas ilimitadas
- Catálogo de tours + import automático (web/PDF)
- Chat en vivo, hasta 3 agentes
- Métricas ROI
- Reservas por WhatsApp (cuando la feature exista, entra acá)
- 1 número de WhatsApp

### TourGuide Plus — $1,000 USD/mes (coming soon, no vendible aún)

Se muestra en la landing como próximo — ancla el valor del plan base y valida
demanda antes de construir. Candidatos a features (a confirmar cuando se acerque
el lanzamiento):

- Follow-ups automáticos a leads (campañas con templates de Meta)
- Cobros/anticipos por link de pago en el chat
- Agentes ilimitados
- Hasta 3 números de WhatsApp (multi-marca)
- Reportes avanzados / export
- Onboarding hecho por nosotros + soporte prioritario

Regla para el roadmap: feature que **retiene leads** → plan base; feature que
**genera revenue extra** → Plus.

## Economía por cliente (referencia)

- OpenAI (gpt-4o-mini): ~$3–5/mes por cliente típico (~$0.0005–0.001 por respuesta)
- Meta: $0 en flujo reactivo (ventana 24h gratis); templates salientes con costo
  por mensaje según país/categoría — revisar tabla vigente antes de lanzar
  follow-ups en Plus
- COGS AI+Meta < 2% del ticket — el pricing es por valor, no por costo

## Protección anti-abuso (interna, no comercial)

Umbral alto por org (ej. 3,000 respuestas/día) que dispara **alerta al equipo**,
nunca corte automático. Su función es atrapar bugs (bot en loop) que queman
dinero en horas, no limitar clientes reales. Cliente legítimo que lo toque
sostenido = conversación humana de pricing.

## Pendientes de implementación (cuando toque)

1. **Metering por org** — tokens/respuestas acumuladas por `org_id`. Base para
   ver margen real por cliente y para la alerta anti-loop. No corta nada.
2. **Alerta de spend** — umbral global de OpenAI + umbral por org.
3. **Stripe** — un solo price ($500/mes) al arrancar; Plus se agrega al lanzarse.
4. **Enum de DB** — `plan_type` es `starter | growth | pro`. Mapeo:
   base → `starter`, Plus → `pro` (o migrar el enum a nombres reales al
   implementar billing).
