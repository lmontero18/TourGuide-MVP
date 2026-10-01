"use client";

import type { TemplateButton } from "@/types";

interface TemplatePreviewProps {
  header?: string | null;
  body: string;
  footer?: string | null;
  buttons?: TemplateButton[];
  // Valores para reemplazar las variables; sin valor se muestra {{variable}}.
  values?: Record<string, string>;
}

function fill(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_, v: string) => values[v] || `{{${v}}}`);
}

// Burbuja estilo WhatsApp: asi lo va a ver el cliente.
export default function TemplatePreview({ header, body, footer, buttons = [], values = {} }: TemplatePreviewProps) {
  return (
    <div className="rounded-2xl bg-[#e9e2d8] p-4">
      <div className="max-w-[300px] rounded-lg rounded-tl-none bg-white shadow-sm">
        <div className="px-3 pt-2 pb-1.5 space-y-1">
          {header && <p className="text-[13px] font-bold text-[#111b21] whitespace-pre-wrap">{fill(header, values)}</p>}
          <p className="text-[13px] leading-snug text-[#111b21] whitespace-pre-wrap break-words">
            {body ? fill(body, values) : <span className="text-slate-400">…</span>}
          </p>
          {footer && <p className="text-[11px] text-[#667781]">{footer}</p>}
          <p className="text-right text-[10px] text-[#667781]">10:24</p>
        </div>
        {buttons.length > 0 && (
          <div className="border-t border-slate-100">
            {buttons.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 border-t border-slate-100 first:border-t-0 py-2 text-[13px] font-medium text-[#00a5f4]"
              >
                {b.type === "URL" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" /><path d="M10 14L21 3" />
                  </svg>
                )}
                {b.text || "…"}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
