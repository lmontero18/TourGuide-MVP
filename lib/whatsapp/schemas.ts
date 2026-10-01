// Validación del payload inbound del webhook de Meta (Cloud API).
// looseObject: Meta agrega campos nuevos sin aviso — se valida solo lo que
// consumimos y el resto pasa sin romper.
import { z } from 'zod'

// Un mensaje individual. Se valida por separado dentro del loop para poder
// saltear mensajes malformados sin descartar el payload completo.
export const webhookMessageSchema = z
  .looseObject({
    // Meta manda el número como dígitos sin '+' — NO normalizar a E.164:
    // 'org_id,phone' es conflict key y cambiar el formato fragmentaría contactos.
    from: z.string().regex(/^\d{6,20}$/),
    // wamid: clave de idempotencia (dedupe de reintentos de Meta) — obligatorio.
    id: z.string().min(1).max(256),
    type: z.string().max(32),
    text: z.looseObject({ body: z.string().max(8192) }).optional(),
    interactive: z
      .looseObject({
        button_reply: z.looseObject({ title: z.string().max(1024) }).optional(),
        list_reply: z.looseObject({ title: z.string().max(1024) }).optional(),
      })
      .optional(),
    audio: z.looseObject({ id: z.string().max(256) }).optional(),
    image: z
      .looseObject({
        id: z.string().max(256),
        caption: z.string().max(4096).optional(),
      })
      .optional(),
    // Medios que el bot no puede ver completos: se le pasan como una nota
    // ("[Ubicación: ...]") para que responda como una persona en vez de
    // quedarse callado (CODE-177).
    sticker: z.looseObject({ id: z.string().max(256) }).optional(),
    video: z
      .looseObject({ id: z.string().max(256), caption: z.string().max(4096).optional() })
      .optional(),
    document: z
      .looseObject({
        id: z.string().max(256).optional(),
        filename: z.string().max(512).optional(),
        caption: z.string().max(4096).optional(),
      })
      .optional(),
    location: z
      .looseObject({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        name: z.string().max(512).optional(),
        address: z.string().max(1024).optional(),
      })
      .optional(),
    contacts: z
      .array(z.looseObject({ name: z.looseObject({ formatted_name: z.string().max(512).optional() }).optional() }))
      .max(20)
      .optional(),
  })
  // El payload debe corresponder al type declarado — un 'text' sin text.body
  // terminaría insertado como mensaje vacío. Types desconocidos (video,
  // sticker, location...) pasan: downstream los guarda como placeholder [type].
  .refine((m) => m.type !== 'text' || m.text !== undefined, { message: 'type=text sin text' })
  .refine((m) => m.type !== 'audio' || m.audio !== undefined, { message: 'type=audio sin audio' })
  .refine((m) => m.type !== 'image' || m.image !== undefined, { message: 'type=image sin image' })

export const webhookPayloadSchema = z.looseObject({
  entry: z
    .array(
      z.looseObject({
        changes: z
          .array(
            z.looseObject({
              value: z
                .looseObject({
                  metadata: z
                    .looseObject({ phone_number_id: z.string().max(64) })
                    .optional(),
                  // Mensajes quedan como unknown acá — validación por mensaje
                  // con webhookMessageSchema en processWebhook.
                  messages: z.array(z.unknown()).optional(),
                  // Estados de entrega de lo que enviamos (bot o agentes). Solo
                  // interesan los 'failed' con codigo de error (ej. 131042).
                  statuses: z
                    .array(
                      z.looseObject({
                        status: z.string().max(32).optional(),
                        errors: z
                          .array(z.looseObject({ code: z.number().optional() }))
                          .optional(),
                      })
                    )
                    .optional(),
                  contacts: z
                    .array(
                      z.looseObject({
                        wa_id: z.string().max(32).optional(),
                        profile: z
                          .looseObject({ name: z.string().max(512).optional() })
                          .optional(),
                      })
                    )
                    .optional(),
                })
                .optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>
export type WebhookMessage = z.infer<typeof webhookMessageSchema>
