import type { LeadDetails, LeadIntent, LeadStatus } from "@/types";

export const STAGES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

// Campos de la ficha en el orden en que se muestran.
export const FICHA_FIELDS: ("tour_interest" | keyof LeadDetails | "next_step")[] = [
  "tour_interest",
  "travel_date",
  "group_size",
  "quote",
  "pickup",
  "needs",
  "language",
  "next_step",
];

export const TEMPERATURE: Record<LeadIntent, { key: "cold" | "warm" | "hot"; className: string }> = {
  browsing: { key: "cold", className: "bg-slate-100 text-slate-500" },
  quoting: { key: "warm", className: "bg-amber-50 text-amber-700" },
  ready: { key: "hot", className: "bg-orange-50 text-orange-700" },
};

export const STAGE_DOT: Record<LeadStatus, string> = {
  new: "bg-slate-400",
  contacted: "bg-blue-500",
  qualified: "bg-amber-500",
  converted: "bg-green-500",
  lost: "bg-slate-300",
};

export function timeAgo(iso: string, locale: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function formatMoney(amount: number, currency: string | null, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency ?? ""}`.trim();
  }
}
