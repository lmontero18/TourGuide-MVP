"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useEmailPrefs } from "@/hooks/useEmailPrefs";

// Correos que recibe el usuario actual. Los avisos importantes (cliente sin
// atender, pago rechazado, plantillas) no se pueden apagar; el resumen si.
export default function EmailPrefs() {
  const t = useTranslations("dashboard.settings.emails");
  const { dailySummary, setDailySummary } = useEmailPrefs();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-navy-900">{t("title")}</h2>
      <p className="mt-0.5 mb-4 text-xs text-slate-400">{t("sub")}</p>
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-medium text-navy-900">{t("dailySummary")}</span>
          <span className="block text-xs text-slate-500">{t("dailySummaryHint")}</span>
        </span>
        <input
          type="checkbox"
          checked={dailySummary ?? true}
          disabled={dailySummary === null}
          onChange={async (e) => {
            const ok = await setDailySummary(e.target.checked);
            if (!ok) toast.error(t("error"));
          }}
          className="mt-1 h-5 w-5 shrink-0 accent-navy-900"
        />
      </label>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{t("always")}</p>
    </section>
  );
}
