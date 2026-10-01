"use client";

import { useLocale, useTranslations } from "next-intl";

interface BillingCardProps {
  wabaId: string;
  paymentFailedAt: string | null;
}

// Facturacion de WhatsApp (solo admin, vive en /settings/whatsapp). Tourfy no
// puede leer la tarjeta de la WABA: solo mostramos el ultimo rechazo 131042 y
// llevamos al admin a Meta para agregarla.
export default function BillingCard({ wabaId, paymentFailedAt }: BillingCardProps) {
  const t = useTranslations("dashboard.settings.whatsapp.billing");
  const locale = useLocale();
  const managerUrl = `https://business.facebook.com/wa/manage/home/?waba_id=${encodeURIComponent(wabaId)}`;
  const billingUrl = "https://business.facebook.com/billing_hub/payment_settings/";

  return (
    <section id="billing" className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-navy-900">{t("title")}</h2>
      <p className="mt-1 mb-4 text-xs text-slate-500">{t("sub")}</p>

      {paymentFailedAt ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">{t("failedTitle")}</p>
          <p className="mt-0.5 text-xs text-red-700">
            {t("failedSub", {
              date: new Date(paymentFailedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
            })}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-navy-900">{t("okTitle")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("okSub")}</p>
        </div>
      )}

      <p className="mt-4 text-xs font-bold text-navy-900">{t("stepsTitle")}</p>
      <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-slate-600">
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={managerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800"
        >
          {t("openManager")} ↗
        </a>
        <a
          href={billingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-navy-900 hover:border-slate-300"
        >
          {t("openBilling")} ↗
        </a>
      </div>
    </section>
  );
}
