"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { billingPortalUrl } from "@/lib/billing/portal";

// Acceso al portal de Stripe: tarjeta, facturas, datos fiscales y cancelacion.
// Settings ya es solo para admins (proxy.ts), no hace falta chequear el rol.
export default function BillingPortal() {
  const t = useTranslations("dashboard.settings.billing");
  const { user } = useAuth();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-navy-900">{t("title")}</h2>
      <p className="mt-0.5 mb-4 text-xs text-slate-400">{t("sub")}</p>
      <ul className="mb-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        {(["card", "invoices", "tax", "cancel"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t(`items.${k}`)}
          </li>
        ))}
      </ul>
      <a
        href={billingPortalUrl(user?.email)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-800"
      >
        {t("open")}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M10 5H5v14h14v-5" />
        </svg>
      </a>
      <p className="mt-3 text-xs text-slate-500">{t("hint")}</p>
    </section>
  );
}
