"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import TemplateForm, { EMPTY_DRAFT, type TemplateDraft } from "@/components/templates/TemplateForm";
import TemplatePreview from "@/components/templates/TemplatePreview";
import { useTemplates } from "@/hooks/useTemplates";
import type { WhatsAppTemplate } from "@/types";

// Plantillas de arranque para agencias de turismo (se pueden editar antes de
// enviar). El contenido sale de los mensajes segun el idioma del panel; se lee
// con t.raw porque las variables {{x}} no son ICU.
const STARTER_KEYS = [
  { key: "reminder", category: "UTILITY" },
  { key: "followup", category: "UTILITY" },
  { key: "promo", category: "MARKETING" },
] as const;

interface StarterContent {
  title: string;
  header?: string;
  body: string;
  quickReplies: string[];
  examples: Record<string, string>;
}

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "border-green-200 bg-green-50 text-green-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  PAUSED: "border-slate-200 bg-slate-50 text-slate-600",
  DISABLED: "border-slate-200 bg-slate-50 text-slate-600",
};

function TemplateCard({ tpl, onDelete }: { tpl: WhatsAppTemplate; onDelete: () => Promise<void> }) {
  const t = useTranslations("dashboard.templates");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = STATUS_STYLE[tpl.status] ? tpl.status : "PAUSED";
  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-navy-900 break-all">{tpl.name}</h3>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[status]}`}>
            {t(`status.${status}`)}
          </span>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{t(`category.${tpl.category}`)}</span>
          <span className="text-[11px] text-slate-400">{tpl.language}</span>
        </div>
        {tpl.status === "REJECTED" && (
          <p className="text-xs text-red-700">{t("rejectedReason", { reason: tpl.rejected_reason ?? "—" })}</p>
        )}
        {tpl.status === "PENDING" && <p className="text-xs text-amber-700">{t("pendingNote")}</p>}
        {tpl.variables.length > 0 && (
          <p className="text-[11px] text-slate-500">{t("variables")}: {tpl.variables.map((v) => `{{${v}}}`).join(", ")}</p>
        )}
        <div className="pt-1">
          {confirm ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-red-700">{t("deleteConfirm")}</span>
              <button onClick={() => setConfirm(false)} className="font-medium text-slate-500 hover:text-navy-900">{t("form.cancel")}</button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onDelete();
                  setBusy(false);
                  setConfirm(false);
                }}
                className="rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t("deleteYes")}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">{t("delete")}</button>
          )}
        </div>
      </div>
      <TemplatePreview header={tpl.header} body={tpl.body} footer={tpl.footer} buttons={tpl.buttons} />
    </article>
  );
}

export default function TemplatesPage() {
  const t = useTranslations("dashboard.templates");
  const locale = useLocale();
  const { templates, connected, error, create, remove } = useTemplates();
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  // Idioma de la plantilla por defecto = idioma del panel.
  const language = locale === "en" ? "en_US" : "es";
  const emptyDraft = useMemo<TemplateDraft>(() => ({ ...EMPTY_DRAFT, language }), [language]);
  const starters = useMemo(
    () =>
      STARTER_KEYS.map(({ key, category }) => {
        const c = t.raw(`starters.${key}`) as StarterContent;
        return { key, ...emptyDraft, category, title: c.title, header: c.header ?? "", body: c.body, quickReplies: c.quickReplies, examples: c.examples };
      }),
    [t, emptyDraft]
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")}>
        {!draft && connected && (
          <button
            onClick={() => setDraft(emptyDraft)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-xs font-bold text-white hover:bg-navy-800"
          >
            + {t("new")}
          </button>
        )}
      </TopBar>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-5xl space-y-5">
          <p className="max-w-2xl text-sm text-slate-500">{t("intro")}</p>

          {!connected && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {t("notConnected")}{" "}
              <Link href="/settings/whatsapp" className="font-semibold underline">{t("connect")}</Link>
            </div>
          )}

          {draft && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-navy-900">{t("new")}</h2>
              <TemplateForm
                key={draft.title}
                initial={draft}
                onCancel={() => setDraft(null)}
                onSubmit={async (input) => {
                  const res = await create(input);
                  if (res.ok) {
                    toast.success(t("sentToReview"));
                    setDraft(null);
                  }
                  return res;
                }}
              />
            </section>
          )}

          {!draft && connected && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("startersTitle")}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {starters.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setDraft(s)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300"
                  >
                    <p className="text-sm font-bold text-navy-900">{s.title}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-500">{s.body}</p>
                    <p className="mt-2 text-[11px] font-semibold text-blue-600">{t("useStarter")}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {error && <p className="text-sm text-red-600">{t("loadError")}</p>}
          {!templates && !error && connected && <p className="text-sm text-slate-400">{t("loading")}</p>}
          {templates && templates.length === 0 && connected && !draft && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{t("empty")}</p>
          )}
          <div className="space-y-3">
            {templates?.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                onDelete={async () => {
                  const res = await remove(tpl.name);
                  if (res.ok) toast.success(t("deleted"));
                  else toast.error(res.error || t("errors.delete"));
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
