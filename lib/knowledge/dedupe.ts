import type { BusinessSection, FAQ, Tour } from "@/types";

const norm = (s: string) => s.trim().toLowerCase();

// Deduplica una lista por una clave, quedándose con la entrada de texto más largo
// (más informativa). Preserva el orden de aparición.
function dedupeBy<T>(items: T[], keyOf: (item: T) => string, textOf: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = norm(keyOf(item));
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || textOf(item).length > textOf(prev).length) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

export const dedupeTours = (tours: Tour[]): Tour[] =>
  dedupeBy(tours, (t) => t.name, (t) => t.info);

export const dedupeBusiness = (sections: BusinessSection[]): BusinessSection[] =>
  dedupeBy(sections, (s) => s.title, (s) => s.content);

export const dedupeFaqs = (faqs: FAQ[]): FAQ[] =>
  dedupeBy(faqs, (f) => f.question, (f) => f.answer);
