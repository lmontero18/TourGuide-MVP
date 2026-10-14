"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Kind = "bug" | "idea" | "other";
const KINDS: Kind[] = ["idea", "bug", "other"];
// Captura opcional: mismo limite que el server (Vercel corta en 4.5 MB).
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// "Enviar comentarios" del sidebar: las agencias nos cuentan errores o lo
// que les falta. Llega por correo al equipo de Tourfy (y queda guardado).
export default function FeedbackButton({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("dashboard.feedback");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  // Captura + object URL de su miniatura (se libera al cambiarla o quitarla).
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const image = shot?.file ?? null;
  const fileRef = useRef<HTMLInputElement>(null);

  function setImage(file: File | null) {
    setShot((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return file ? { file, url: URL.createObjectURL(file) } : null;
    });
  }

  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast.error(t("imageType"));
    if (file.size > MAX_IMAGE_BYTES) return toast.error(t("imageTooLarge"));
    setImage(file);
  }

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
    const form = new FormData();
    form.set("kind", kind);
    form.set("message", message.trim());
    if (pathname) form.set("page", pathname);
    if (image) form.set("image", image);
    const res = await fetch("/api/feedback", { method: "POST", body: form }).catch(() => null);
    setSending(false);
    if (res?.ok) {
      toast.success(t("thanks"));
      setMessage("");
      setImage(null);
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
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
                if (file) {
                  e.preventDefault();
                  pickImage(file);
                }
              }}
              placeholder={t(`placeholders.${kind}`)}
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-navy-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                pickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {shot ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
                <img src={shot.url} alt="" className="h-14 w-20 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{shot.file.name}</span>
                <button type="button" onClick={() => setImage(null)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-navy-900">
                  {t("removeImage")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title={t("attachHint")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-navy-900"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
                {t("attach")}
                <span className="font-normal text-slate-400">· {t("attachHint")}</span>
              </button>
            )}

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
