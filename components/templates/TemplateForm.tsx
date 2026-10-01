"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import TemplatePreview from "./TemplatePreview";
import type { NewTemplate } from "@/hooks/useTemplates";

export interface TemplateDraft {
  title: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  header: string;
  body: string;
  footer: string;
  quickReplies: string[];
  url: { text: string; url: string } | null;
  examples: Record<string, string>;
}

export const EMPTY_DRAFT: TemplateDraft = {
  title: "",
  category: "UTILITY",
  language: "es",
  header: "",
  body: "",
  footer: "",
  quickReplies: [],
  url: null,
  examples: {},
};

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en_US", label: "English (US)" },
  { code: "pt_BR", label: "Português (BR)" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

const SUGGESTED_VARS = ["nombre", "tour", "fecha", "hora", "precio"];

// Nombre interno que exige Meta: minusculas, numeros y guion bajo.
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function extractVariables(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g)].map((m) => m[1]))];
}

interface TemplateFormProps {
  initial: TemplateDraft;
  onSubmit: (input: NewTemplate) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancel: () => void;
}

export default function TemplateForm({ initial, onSubmit, onCancel }: TemplateFormProps) {
  const t = useTranslations("dashboard.templates");
  const [draft, setDraft] = useState<TemplateDraft>(initial);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const variables = useMemo(() => extractVariables(`${draft.header} ${draft.body}`), [draft.header, draft.body]);
  const name = slugify(draft.title);
  const missingExample = variables.some((v) => !draft.examples[v]?.trim());
  const canSubmit = !!name && !!draft.body.trim() && !missingExample && !sending;

  function insertVariable(v: string) {
    set("body", `${draft.body}${draft.body && !draft.body.endsWith(" ") ? " " : ""}{{${v}}}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const buttons = [
      ...draft.quickReplies.filter((q) => q.trim()).map((text) => ({ type: "QUICK_REPLY" as const, text: text.trim() })),
      ...(draft.url?.text.trim() && draft.url.url.trim()
        ? [{ type: "URL" as const, text: draft.url.text.trim(), url: draft.url.url.trim() }]
        : []),
    ];
    const res = await onSubmit({
      name,
      category: draft.category,
      language: draft.language,
      header: draft.header.trim() || undefined,
      body: draft.body.trim(),
      footer: draft.footer.trim() || undefined,
      buttons: buttons.length ? buttons : undefined,
      examples: Object.fromEntries(variables.map((v) => [v, draft.examples[v]?.trim() ?? ""])),
    });
    setSending(false);
    if (!res.ok) setError(res.error);
  }

  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const label = "block text-xs font-semibold text-navy-900 mb-1.5";

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 min-w-0">
        <div>
          <label htmlFor="tpl-title" className={label}>{t("form.title")}</label>
          <input id="tpl-title" className={input} value={draft.title} maxLength={60} onChange={(e) => set("title", e.target.value)} placeholder={t("form.titlePlaceholder")} />
          {name && <p className="mt-1 text-[11px] text-slate-400">{t("form.internalName")}: <code>{name}</code></p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={label}>{t("form.category")}</span>
            <div className="grid grid-cols-2 gap-2">
              {(["UTILITY", "MARKETING"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    draft.category === c ? "border-navy-900 bg-navy-900/5 ring-2 ring-navy-900/10" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-xs font-bold text-navy-900">{t(`category.${c}`)}</span>
                  <span className="block text-[10px] leading-snug text-slate-500">{t(`categoryHint.${c}`)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="tpl-lang" className={label}>{t("form.language")}</label>
            <select id="tpl-lang" className={input} value={draft.language} onChange={(e) => set("language", e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tpl-header" className={label}>{t("form.header")} <span className="font-normal text-slate-400">· {t("form.optional")}</span></label>
          <input id="tpl-header" className={input} value={draft.header} maxLength={60} onChange={(e) => set("header", e.target.value)} placeholder={t("form.headerPlaceholder")} />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="tpl-body" className={label}>{t("form.body")}</label>
            <span className="text-[10px] text-slate-400 tabular-nums">{draft.body.length}/1024</span>
          </div>
          <textarea id="tpl-body" className={`${input} min-h-32 resize-y`} value={draft.body} maxLength={1024} onChange={(e) => set("body", e.target.value)} placeholder={t("form.bodyPlaceholder")} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">{t("form.insertVariable")}</span>
            {SUGGESTED_VARS.map((v) => (
              <button key={v} type="button" onClick={() => insertVariable(v)} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-navy-900 hover:border-slate-300">
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>

        {variables.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold text-navy-900">{t("form.examples")}</p>
            <p className="mb-2 text-[11px] text-slate-500">{t("form.examplesHint")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {variables.map((v) => (
                <div key={v}>
                  <label htmlFor={`tpl-ex-${v}`} className="block text-[11px] font-medium text-slate-600 mb-1">{`{{${v}}}`}</label>
                  <input
                    id={`tpl-ex-${v}`}
                    className={input}
                    value={draft.examples[v] ?? ""}
                    maxLength={200}
                    onChange={(e) => set("examples", { ...draft.examples, [v]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="tpl-footer" className={label}>{t("form.footer")} <span className="font-normal text-slate-400">· {t("form.optional")}</span></label>
          <input id="tpl-footer" className={input} value={draft.footer} maxLength={60} onChange={(e) => set("footer", e.target.value)} placeholder={t("form.footerPlaceholder")} />
        </div>

        <div>
          <span className={label}>{t("form.buttons")} <span className="font-normal text-slate-400">· {t("form.optional")}</span></span>
          <div className="space-y-2">
            {draft.quickReplies.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  aria-label={t("form.quickReply")}
                  className={input}
                  value={q}
                  maxLength={25}
                  onChange={(e) => set("quickReplies", draft.quickReplies.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={t("form.quickReplyPlaceholder")}
                />
                <button type="button" onClick={() => set("quickReplies", draft.quickReplies.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-red-500" aria-label={t("form.remove")}>×</button>
              </div>
            ))}
            {draft.url && (
              <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                <input aria-label={t("form.urlText")} className={input} value={draft.url.text} maxLength={25} onChange={(e) => set("url", { ...draft.url!, text: e.target.value })} placeholder={t("form.urlTextPlaceholder")} />
                <input aria-label="URL" className={input} value={draft.url.url} onChange={(e) => set("url", { ...draft.url!, url: e.target.value })} placeholder="https://" />
                <button type="button" onClick={() => set("url", null)} className="px-2 text-slate-400 hover:text-red-500" aria-label={t("form.remove")}>×</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {draft.quickReplies.length < 3 && (
                <button type="button" onClick={() => set("quickReplies", [...draft.quickReplies, ""])} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
                  + {t("form.addQuickReply")}
                </button>
              )}
              {!draft.url && (
                <button type="button" onClick={() => set("url", { text: "", url: "" })} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
                  + {t("form.addUrl")}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500 hover:text-navy-900">{t("form.cancel")}</button>
          <button type="submit" disabled={!canSubmit} className="h-9 rounded-lg bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-40">
            {sending ? `${t("form.submit")}…` : t("form.submit")}
          </button>
        </div>
      </div>

      <div className="lg:sticky lg:top-0 self-start space-y-2">
        <p className="text-xs font-semibold text-navy-900">{t("form.preview")}</p>
        <TemplatePreview
          header={draft.header}
          body={draft.body}
          footer={draft.footer}
          buttons={[
            ...draft.quickReplies.filter(Boolean).map((text) => ({ type: "QUICK_REPLY" as const, text })),
            ...(draft.url?.text ? [{ type: "URL" as const, text: draft.url.text }] : []),
          ]}
          values={draft.examples}
        />
        <p className="text-[11px] leading-relaxed text-slate-500">{t("form.reviewNote")}</p>
      </div>
    </form>
  );
}
