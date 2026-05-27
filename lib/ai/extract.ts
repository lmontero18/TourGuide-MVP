import OpenAI from "openai";
import type { BusinessSection, FAQ, Tour, TourSource } from "@/types";

// Modelo configurable por env. gpt-4o-mini es barato y soporta structured outputs.
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada");
  client ??= new OpenAI({ apiKey });
  return client;
}

export interface ExtractionDraft {
  tours: Tour[];
  faqs: FAQ[];
  business: BusinessSection[];
}

// Instrucciones estáticas y largas → OpenAI las cachea automáticamente (prompts >1024 tokens).
const SYSTEM_PROMPT = `Eres un asistente que captura TODO el contexto de una agencia de turismo a partir del contenido de su sitio web (o de su tarifario), para que un bot de WhatsApp pueda responder como si conociera el negocio a fondo.

Devuelve tres listas: tours, business_info y faqs.

TOURS — captura ABSOLUTAMENTE TODAS las ofertas, no solo las más visibles. Incluye day tours, tours de medio día y día completo, tours de varios días, TREKS, PAQUETES y combos, traslados/transfers, servicios privados, excursiones y add-ons. Si dudas si algo es un tour, inclúyelo igual con confidence baja. Para cada uno:
- name: nombre de la oferta.
- category: tipo corto y consistente (ej. "Day tour", "Paquete", "Multi-día", "Trek", "Transfer", "Privado", "City tour"). Si no es claro, null.
- prices: lista de tarifas estructuradas, UNA por cada precio que aparezca. Cada tarifa tiene: label (etiqueta como "Local", "Extranjero", "Niño", "Grupo", "Desde" si corresponde, o null si es un precio único), amount (número, sin símbolo ni separadores de miles), currency (SIEMPRE el código ISO de 3 letras en MAYÚSCULAS, NUNCA el símbolo: convertí ₡→CRC, S/→PEN, $→USD salvo que el contexto indique otra moneda local como MXN/ARS/CLP/COP, R$→BRL, Q→GTQ, €→EUR). Incluye SOLO las tarifas que realmente aparezcan; si la oferta no tiene precio visible, prices = []. Un descuento (ej. "niños -50%") NO es una tarifa: va en info, no en prices. NO inventes montos ni tarifas, NO conviertas monedas.
- info: notas en TEXTO LIBRE — qué incluye y qué no, duración, punto de salida, dificultad, condiciones. NO pongas los precios acá (esos van en prices).
- confidence: 0 a 1 (bajo si el precio o los datos son ambiguos o parciales).

BUSINESS_INFO — el contexto general del negocio en secciones tituladas. SIEMPRE incluye, como primera sección, una titulada "Sobre el negocio": un resumen claro de qué hace la agencia, qué tipo de tours y servicios ofrece, sus destinos o zonas, idiomas y lo que la distingue — redactado a partir de TODO el contenido disponible. Resumir o parafrasear el contenido NO es inventar; lo que no debes hacer es agregar datos (precios, teléfonos, políticas) que no aparezcan. Además, crea una sección por cada tema que aparezca en el sitio. Títulos sugeridos (usa los que apliquen y agrega otros): "Por qué elegirnos", "Políticas de cancelación y reembolso", "Reservas y depósitos", "Formas de pago", "Contacto", "Horario de atención", "Idiomas", "Zonas y destinos", "Qué incluye/no incluye en general", "Recomendaciones", "Certificaciones y seguridad". Para cada sección:
- title: el título de la sección.
- content: el contenido tal como lo expresa el negocio (la sección "Sobre el negocio" puede parafrasear; las demás, datos textuales sin inventar).
- confidence: 0 a 1.

FAQS — preguntas frecuentes reales o claramente implícitas, con question, answer y confidence.

Reglas:
- Responde en el MISMO idioma del contenido (normalmente español).
- No repitas secciones ni tours: una sola sección por tema y un solo tour por nombre. Si un dato aparece en varias páginas, combínalo en una sola entrada.
- No inventes datos puntuales (precios, contacto, políticas) que no estén en el contenido; márcalos con confidence baja si dudas.
- Solo si NO hay absolutamente nada de contenido útil (página vacía o error), devuelve las tres listas vacías. En cualquier otro caso, business_info debe tener al menos la sección "Sobre el negocio".`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tours: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          category: { type: ["string", "null"] },
          prices: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: ["string", "null"] },
                amount: { type: "number" },
                currency: { type: "string" },
              },
              required: ["label", "amount", "currency"],
            },
          },
          info: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name", "category", "prices", "info", "confidence"],
      },
    },
    business_info: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["title", "content", "confidence"],
      },
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["question", "answer", "confidence"],
      },
    },
  },
  required: ["tours", "business_info", "faqs"],
} as const;

interface RawPrice {
  label: string | null;
  amount: number;
  currency: string;
}
interface RawTour {
  name: string;
  category: string | null;
  prices: RawPrice[];
  info: string;
  confidence: number;
}
interface RawBusiness {
  title: string;
  content: string;
  confidence: number;
}
interface RawFaq {
  question: string;
  answer: string;
  confidence: number;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

// Red de seguridad: si el modelo devuelve un símbolo en vez del código ISO, lo normaliza.
const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "USD", "US$": "USD", "USD$": "USD", "₡": "CRC", "S/": "PEN", "S/.": "PEN",
  "R$": "BRL", "Q": "GTQ", "€": "EUR", "₲": "PYG", "BS": "BOB", "BS.": "BOB",
};
const normCurrency = (raw: string): string => {
  const c = raw.trim();
  return CURRENCY_SYMBOLS[c.toUpperCase()] ?? CURRENCY_SYMBOLS[c] ?? c.toUpperCase().slice(0, 8);
};

/**
 * Extrae el contexto completo del negocio (tours + secciones de negocio + FAQs)
 * desde texto (markdown del sitio o de un documento). Usa Structured Outputs
 * (json_schema strict) para garantizar la forma del JSON.
 */
export async function extractFromText(content: string, source: TourSource): Promise<ExtractionDraft> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "business_extraction", strict: true, schema: RESPONSE_SCHEMA },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return { tours: [], faqs: [], business: [] };

  let parsed: { tours: RawTour[]; business_info: RawBusiness[]; faqs: RawFaq[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { tours: [], faqs: [], business: [] };
  }

  const tours: Tour[] = (parsed.tours ?? [])
    .filter((tour) => tour.name?.trim())
    .map((tour) => ({
      id: crypto.randomUUID(),
      name: tour.name.trim(),
      category: tour.category?.trim() || undefined,
      prices: (tour.prices ?? [])
        .filter((p) => Number.isFinite(p.amount) && p.currency?.trim())
        .map((p) => ({
          label: p.label?.trim() || undefined,
          amount: p.amount,
          currency: normCurrency(p.currency),
        })),
      info: tour.info?.trim() ?? "",
      source,
      confidence: clamp01(tour.confidence),
    }));

  const business: BusinessSection[] = (parsed.business_info ?? [])
    .filter((section) => section.title?.trim() && section.content?.trim())
    .map((section) => ({
      id: crypto.randomUUID(),
      title: section.title.trim(),
      content: section.content.trim(),
      source,
      confidence: clamp01(section.confidence),
    }));

  const faqs: FAQ[] = (parsed.faqs ?? [])
    .filter((faq) => faq.question?.trim() && faq.answer?.trim())
    .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }));

  return { tours, faqs, business };
}
