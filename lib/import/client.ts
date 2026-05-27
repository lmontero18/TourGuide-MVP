import type { BusinessSection, FAQ, Tour } from "@/types";

export interface ImportResult {
  tours: Tour[];
  faqs: FAQ[];
  business: BusinessSection[];
  /** true si la página cargó pero casi no tenía texto (probable sitio JS-heavy). */
  thin: boolean;
}

// Wrapper de cliente para POST /api/import. Lo usan el onboarding y el editor del dashboard.
export async function importFromUrl(url: string): Promise<ImportResult> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "url", url }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "No pudimos importar desde esa URL");
  return {
    tours: result.draft?.tours ?? [],
    faqs: result.draft?.faqs ?? [],
    business: result.draft?.business ?? [],
    thin: Boolean(result.thin),
  };
}
