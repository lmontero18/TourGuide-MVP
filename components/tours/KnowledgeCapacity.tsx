"use client";

import { useTranslations } from "next-intl";

// Solo se muestra cuando ya hay que actuar: por debajo, un "48% usado" sin
// contexto confunde a la agencia ("¿se me acaba algo? ¿pago mas?").
const SHOW_FROM = 0.7;

// Cuanto del espacio del bot ocupa lo que sabe de la agencia. Cerca del tope
// (o pasado) avisa: el final se recortaria y el bot perderia informacion.
export default function KnowledgeCapacity({ ratio }: { ratio: number }) {
  const t = useTranslations("dashboard.tours.capacity");
  if (ratio < SHOW_FROM) return null;
  const pct = Math.round(ratio * 100);
  const tone = ratio > 1 ? "over" : ratio >= 0.8 ? "near" : "ok";
  const bar = { ok: "bg-navy-900", near: "bg-amber-500", over: "bg-red-500" }[tone];
  const text = { ok: "text-slate-500", near: "text-amber-700", over: "text-red-700" }[tone];

  return (
    <div className="max-w-sm" title={t("hint")}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-navy-900">{t("label")}</span>
        <span className={`tabular-nums ${text}`}>{t("percent", { pct })}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)} aria-label={t("label")}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {tone !== "ok" && <p className={`mt-1 text-[11px] ${text}`}>{t(tone)}</p>}
    </div>
  );
}
