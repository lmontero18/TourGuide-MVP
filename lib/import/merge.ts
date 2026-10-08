import type { BusinessSection, FAQ, PriceTier, Tour } from "@/types";

// Reimportar la web o un tarifario cuando la agencia ya tiene su base de
// conocimiento (CODE-188). La importacion devuelve el sitio entero de nuevo;
// esto lo compara con lo que ya existe para que solo se agregue lo nuevo y los
// cambios de precio se confirmen a mano. Nunca borra nada.

export interface PriceChange {
  existing: Tour;
  incoming: Tour;
}

export interface ImportPlan {
  /** Tours que no existen todavia. */
  added: Tour[];
  /** Tours que ya existen y en la fuente tienen otras tarifas. */
  priceChanges: PriceChange[];
  /** Tours que ya existen sin cambios de precio. */
  unchanged: number;
  /** Tours de la agencia que no aparecieron en la fuente (solo informativo). */
  missing: Tour[];
  faqs: FAQ[];
  business: BusinessSection[];
}

// "Tour al Volcán Masaya de Noche!" -> "volcan masaya noche"
const STOP = new Set(["tour", "tours", "de", "del", "la", "el", "los", "las", "al", "a", "en", "y", "the", "of", "to", "and", "in"]);

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(" ");
}

function similarity(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  // Un nombre de una sola palabra ("Granada") calzaria con cualquier tour que
  // la contenga: ahi solo vale la coincidencia exacta.
  if (Math.min(ta.size, tb.size) < 2) return 0;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

// Mismo tour aunque el nombre cambie un poco ("Best Granada City Tour" vs
// "Best Granada Nicaragua City Tour | Culture & History"): todas las palabras
// del nombre mas corto estan en el otro, o casi todas con nombres largos.
const MATCH_THRESHOLD = 0.8;

function findMatch(incoming: Tour, existing: Tour[], taken: Set<string>): Tour | null {
  const name = normalizeName(incoming.name);
  if (!name) return null;
  let best: Tour | null = null;
  let bestScore = 0;
  for (const tour of existing) {
    if (taken.has(tour.id)) continue;
    const other = normalizeName(tour.name);
    if (other === name) return tour;
    const score = similarity(name, other);
    if (score > bestScore) {
      best = tour;
      bestScore = score;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

const priceKey = (prices: PriceTier[] | undefined) =>
  (prices ?? [])
    .map((p) => `${p.currency.toUpperCase()}:${Number(p.amount)}:${(p.label ?? "").trim().toLowerCase()}`)
    .sort()
    .join("|");

export function planImport(
  current: { tours: Tour[]; faqs: FAQ[]; business: BusinessSection[] },
  incoming: { tours: Tour[]; faqs: FAQ[]; business: BusinessSection[] }
): ImportPlan {
  const taken = new Set<string>();
  const added: Tour[] = [];
  const priceChanges: PriceChange[] = [];
  let unchanged = 0;

  for (const tour of incoming.tours) {
    if (!tour.name?.trim()) continue;
    const match = findMatch(tour, current.tours, taken);
    if (!match) {
      added.push({ ...tour, id: crypto.randomUUID() });
      continue;
    }
    taken.add(match.id);
    // Solo se ofrecen cambios concretos de tarifa. La descripcion la reescribe
    // la IA distinta en cada lectura: compararla daria falsos cambios en todo.
    const incomingPrices = priceKey(tour.prices);
    if (incomingPrices && incomingPrices !== priceKey(match.prices)) priceChanges.push({ existing: match, incoming: tour });
    else unchanged++;
  }

  const missing = current.tours.filter((t) => t.name.trim() && !taken.has(t.id));

  const knownQuestions = new Set(current.faqs.map((f) => normalizeName(f.question)));
  const faqs = incoming.faqs.filter((f) => f.question?.trim() && !knownQuestions.has(normalizeName(f.question)));

  const knownSections = new Set(current.business.map((s) => normalizeName(s.title)));
  const business = incoming.business
    .filter((s) => s.title?.trim() && !knownSections.has(normalizeName(s.title)))
    .map((s) => ({ ...s, id: crypto.randomUUID() }));

  return { added, priceChanges, unchanged, missing, faqs, business };
}
