"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { OUTBOUND_ACCEPT } from "@/lib/whatsapp/outboundMedia";

// ~8 lineas de text-sm (20px) + padding.
const MAX_HEIGHT = 180;

interface ChatInputProps {
  onSend: (message: string) => void;
  // Si viene, aparece el clip para mandar una foto o PDF (CODE-194). El texto
  // escrito va como mensaje del archivo. Devuelve true si se envio.
  onSendFile?: (file: File, caption: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, onSendFile, disabled, placeholder }: ChatInputProps) {
  const t = useTranslations("dashboard.chat");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sendingFile, setSendingFile] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = disabled || sendingFile;

  // Crece con el texto hasta MAX_HEIGHT y despues scrollea adentro (CODE-192).
  // Al enviar, value vuelve a "" y la altura vuelve a la minima.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const handleSend = async () => {
    if (busy) return;
    if (file && onSendFile) {
      setSendingFile(true);
      const ok = await onSendFile(file, value.trim());
      setSendingFile(false);
      if (ok) {
        setFile(null);
        setValue("");
      }
      return;
    }
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-navy-900">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
          {sendingFile ? (
            <span className="shrink-0 text-slate-500">{t("sendingFile")}</span>
          ) : (
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label={t("removeAttachment")}
              title={t("removeAttachment")}
              className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
        {onSendFile && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={OUTBOUND_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) setFile(picked);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label={t("attach")}
              title={t("attach")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
          </>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={file ? t("captionPlaceholder") : placeholder || t("typePlaceholder")}
          disabled={busy}
          rows={2}
          className="flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={busy || (!value.trim() && !file)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white transition-all hover:bg-navy-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
