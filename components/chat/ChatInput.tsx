"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OUTBOUND_ACCEPT, outboundMediaSpec } from "@/lib/whatsapp/outboundMedia";

// ~8 lineas de text-sm (20px) + padding.
const MAX_HEIGHT = 180;
// Tope por envio, como WhatsApp Web.
const MAX_FILES = 10;

interface Attachment {
  id: string;
  file: File;
  // Miniatura (solo imagenes); se libera al quitarla.
  url: string | null;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  // Si viene, se pueden adjuntar fotos y PDFs (CODE-194): clip, arrastrar o
  // pegar. Al enviar la bandeja se vacia y el chat muestra el envio.
  onSendFiles?: (files: File[], caption: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, onSendFiles, disabled, placeholder }: ChatInputProps) {
  const t = useTranslations("dashboard.chat");
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canAttach = !!onSendFiles && !disabled;

  // Crece con el texto hasta MAX_HEIGHT y despues scrollea adentro (CODE-192).
  // Al enviar, value vuelve a "" y la altura vuelve a la minima.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const addFiles = (list: FileList | File[]) => {
    const all = Array.from(list);
    // Tipo o tamaño invalido: se avisa al agregarlo, no al enviar.
    const picked = all.filter((f) => {
      const spec = outboundMediaSpec(f.type);
      return spec && f.size <= spec.maxBytes;
    });
    if (picked.length < all.length) {
      toast.error(all.some((f) => !outboundMediaSpec(f.type)) ? t("errors.fileType") : t("errors.fileTooLarge"));
    }
    if (!picked.length) return;
    setFiles((prev) => [
      ...prev,
      ...picked.slice(0, MAX_FILES - prev.length).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
  };

  const removeFile = (id: string) =>
    setFiles((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone?.url) URL.revokeObjectURL(gone.url);
      return prev.filter((a) => a.id !== id);
    });

  const handleSend = () => {
    if (disabled) return;
    if (files.length && onSendFiles) {
      // Las miniaturas de la bandeja se liberan: el chat usa sus propias.
      files.forEach((a) => a.url && URL.revokeObjectURL(a.url));
      onSendFiles(files.map((a) => a.file), value.trim());
      setFiles([]);
      setValue("");
      return;
    }
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div
      className={`relative border-t border-slate-200 bg-white p-3 ${dragging ? "ring-2 ring-inset ring-blue-400" : ""}`}
      onDragOver={(e) => {
        if (!canAttach || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!canAttach) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-blue-50/90 text-sm font-semibold text-blue-700">
          {t("dropFiles")}
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {files.map((a) => (
            <div
              key={a.id}
              title={a.file.name}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              {a.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URL local
                <img src={a.url} alt={a.file.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1.5 text-center">
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">PDF</span>
                  <span className="line-clamp-2 break-all text-[10px] leading-tight text-slate-600">{a.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(a.id)}
                aria-label={t("removeAttachment")}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy-900/70 text-white opacity-90 hover:bg-navy-900"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {files.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={t("attach")}
              title={t("attach")}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-navy-900"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {onSendFiles && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={OUTBOUND_ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || files.length >= MAX_FILES}
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
          onPaste={(e) => {
            if (!canAttach || !e.clipboardData.files.length) return;
            e.preventDefault();
            addFiles(e.clipboardData.files);
          }}
          placeholder={files.length ? t("captionPlaceholder") : placeholder || t("typePlaceholder")}
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && !files.length)}
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
