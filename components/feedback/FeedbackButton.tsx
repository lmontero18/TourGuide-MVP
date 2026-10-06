"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Kind = "bug" | "idea" | "other";
const KINDS: Kind[] = ["idea", "bug", "other"];

// "Enviar comentarios" del sidebar: las agencias nos cuentan errores o lo
// que les falta. Llega por correo al equipo de Tourfy (y queda guardado).
export default function FeedbackButton({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("dashboard.feedback");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) return;
    setSending(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, message: message.trim(), page: pathname }),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) {
      toast.success(t("thanks"));
      setMessage("");
      setOpen(false);
    } else {
      const body = await res?.json().catch(() => ({}));
      toast.error(body?.error || t("error"));
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t("button")}
        className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-navy-900"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <path d="M9 11h.01M12 11h.01M15 11h.01" />
        </svg>
        {!collapsed && <span className="whitespace-nowrap">{t("button")}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/30 p-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={send}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="feedback-title" className="font-display text-lg font-extrabold text-navy-900">{t("title")}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t("sub")}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="text-xl leading-none text-slate-400 hover:text-navy-900">×</button>
            </div>

            <div className="mt-4 flex gap-2" role="radiogroup" aria-label={t("kindLabel")}>
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    kind === k ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t(`kinds.${k}`)}
                </button>
              ))}
            </div>

            <label htmlFor="feedback-message" className="sr-only">{t("messageLabel")}</label>
            <textarea
              id="feedback-message"
              autoFocus
              rows={5}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(`placeholders.${kind}`)}
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-navy-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500 hover:text-navy-900">{t("cancel")}</button>
              <button type="submit" disabled={sending || message.trim().length < 3} className="h-9 rounded-lg bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-40">
                {sending ? t("sending") : t("send")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
