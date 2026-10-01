"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import TemplatePreview from "@/components/templates/TemplatePreview";
import { useTemplates } from "@/hooks/useTemplates";
import type { WhatsAppTemplate } from "@/types";

interface TemplatePickerProps {
  conversationId: string;
  contactName: string | null;
  onClose: () => void;
}

// Retomar una conversacion pasada la ventana de 24h con una plantilla aprobada (CODE-174).
export default function TemplatePicker({ conversationId, contactName, onClose }: TemplatePickerProps) {
  const t = useTranslations("dashboard.chat.templates");
  const { templates, error } = useTemplates();
  const [selected, setSelected] = useState<WhatsAppTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const approved = templates?.filter((tpl) => tpl.status === "APPROVED") ?? null;

  function pick(tpl: WhatsAppTemplate) {
    setSelected(tpl);
    // El nombre del cliente ya completado si la plantilla lo usa.
    const first = contactName?.trim().split(/\s+/)[0];
    setValues(first && tpl.variables.includes("nombre") ? { nombre: first } : {});
  }

  async function send() {
    if (!selected) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${conversationId}/template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selected.name, language: selected.language, values }),
    });
    const body = await res.json().catch(() => ({}));
    setSending(false);
    if (res.ok) {
      toast.success(t("sent"));
      onClose();
    } else {
      toast.error(body.error ?? t("error"));
    }
  }

  const ready = selected && selected.variables.every((v) => values[v]?.trim());

  return (
    <div className="border-t border-slate-200 bg-white p-3 space-y-3 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-navy-900">{selected ? selected.name : t("choose")}</p>
        <button onClick={selected ? () => setSelected(null) : onClose} className="text-xs font-medium text-slate-500 hover:text-navy-900">
          {selected ? t("back") : t("close")}
        </button>
      </div>

      {!selected && (
        <>
          {error && <p className="text-xs text-red-600">{t("error")}</p>}
          {!approved && !error && <p className="text-xs text-slate-400">{t("loading")}</p>}
          {approved?.length === 0 && (
            <p className="text-xs text-slate-500">
              {t("none")} <Link href="/templates" className="font-semibold text-blue-600 underline">{t("create")}</Link>
            </p>
          )}
          <div className="grid gap-2">
            {approved?.map((tpl) => (
              <button key={tpl.id} onClick={() => pick(tpl)} className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-300">
                <p className="text-xs font-bold text-navy-900">{tpl.name} <span className="font-normal text-slate-400">· {tpl.language}</span></p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{tpl.body}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-2 min-w-0">
            {selected.variables.length === 0 && <p className="text-xs text-slate-500">{t("noVariables")}</p>}
            {selected.variables.map((v) => (
              <div key={v}>
                <label htmlFor={`tplv-${v}`} className="block text-[11px] font-medium text-slate-600 mb-1">{`{{${v}}}`}</label>
                <input
                  id={`tplv-${v}`}
                  value={values[v] ?? ""}
                  maxLength={500}
                  onChange={(e) => setValues((cur) => ({ ...cur, [v]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
            <p className="text-[11px] text-slate-500">{t("costNote")}</p>
            <button onClick={send} disabled={!ready || sending} className="h-9 w-full rounded-lg bg-navy-900 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-40">
              {sending ? `${t("send")}…` : t("send")}
            </button>
          </div>
          <TemplatePreview header={selected.header} body={selected.body} footer={selected.footer} buttons={selected.buttons} values={values} />
        </div>
      )}
    </div>
  );
}
