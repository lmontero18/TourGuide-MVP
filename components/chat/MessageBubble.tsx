"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { DeliveryStatus, MessageRole } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { deliveryReason } from "@/lib/whatsapp/deliveryReasons";
import { useChatMediaUrl } from "@/hooks/useChatMediaUrl";
import { parseReaction } from "@/lib/whatsapp/placeholders";
import { parseDocumentContent } from "@/lib/whatsapp/outboundMedia";

interface MessageBubbleProps {
  content: string;
  role: MessageRole;
  createdAt: string;
  mediaPath?: string | null;
  mediaType?: string | null;
  // Miniatura local de una foto que se esta enviando (optimista).
  previewUrl?: string | null;
  pending?: boolean;
  failed?: boolean;
  delivery?: DeliveryStatus | null;
  errorCode?: number | null;
  senderId?: string | null;
  senderName?: string | null;
  templateName?: string | null;
}

function Spinner({ className = "" }: { className?: string }) {
  return <span className={`h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent ${className}`} />;
}

// ✓ enviado · ✓✓ entregado · ✓✓ celeste leido (como WhatsApp).
function Ticks({ status, label }: { status: DeliveryStatus; label: string }) {
  if (status === "failed") return null;
  const double = status !== "sent";
  return (
    <span title={label} aria-label={label} className={`inline-flex ${status === "read" ? "text-sky-300" : "text-white/50"}`}>
      <svg width={double ? 15 : 11} height="10" viewBox={double ? "0 0 20 12" : "0 0 14 12"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6.5l3.5 3.5L12 2" />
        {double && <path d="M7 6.5l3.5 3.5L18 2" />}
      </svg>
    </span>
  );
}

const ROLE_STYLES: Record<MessageRole, { wrapper: string; bubble: string; label: "roleClient" | "roleBot" | "roleYou" }> = {
  user: {
    wrapper: "justify-start",
    bubble: "bg-white border border-slate-200 text-navy-900 rounded-tl-md shadow-sm",
    label: "roleClient",
  },
  assistant: {
    wrapper: "justify-start",
    bubble: "bg-blue-50 border border-blue-100 text-navy-900 rounded-tl-md",
    label: "roleBot",
  },
  agent: {
    wrapper: "justify-end",
    // bubble-own: en modo oscuro es gris, no claro (app/globals.css).
    bubble: "bubble-own bg-navy-900 text-white rounded-tr-md shadow-md",
    label: "roleYou",
  },
};

export default function MessageBubble({ content, role, createdAt, mediaPath, mediaType, previewUrl, pending, failed, delivery, errorCode, senderId, senderName, templateName }: MessageBubbleProps) {
  const t = useTranslations("dashboard.chat");
  const tD = useTranslations("dashboard.chat.delivery");
  const { role: userRole, user } = useAuth();
  const undelivered = delivery === "failed";
  const reason = deliveryReason(errorCode);
  const style = ROLE_STYLES[role];
  // Burbuja de agente: quien la escribio ("Tú" o el nombre) y si fue plantilla.
  // Mensajes viejos sin sender_id y los optimistas propios no llevan etiqueta.
  const agentLabel =
    role === "agent" && senderId
      ? [senderId === user?.id ? t(style.label) : senderName ?? "", templateName ? t("templateTag", { name: templateName }) : ""]
          .filter(Boolean)
          .join(" · ")
      : null;
  const signedUrl = useChatMediaUrl(mediaPath);
  const mediaUrl = signedUrl ?? previewUrl ?? null;
  const [imgFailed, setImgFailed] = useState(false);
  const isMediaPlaceholder = /^\[[a-z_]+\]$/.test(content);
  const reaction = parseReaction(content);
  // PDF que mando un agente (CODE-194): tarjeta con el nombre + su texto.
  const doc = mediaType === "document" ? parseDocumentContent(content) : null;

  // Mensaje que Meta no entrego: la burbuja pasa a rojo claro y abajo se
  // explica el motivo con la accion para resolverlo.
  const bubbleClass = undelivered
    ? "bg-red-50 border border-red-200 text-navy-900 rounded-tr-md"
    : style.bubble;

  return (
    <div className={`flex flex-col ${undelivered ? "items-end" : ""}`}>
    <div className={`flex w-full ${style.wrapper}`}>
      <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 max-w-[75%] ${bubbleClass} ${pending ? "opacity-70" : ""} ${failed ? "ring-2 ring-red-400" : ""}`}>
        {role !== "agent" && (
          <span className={`block text-[10px] font-bold mb-0.5 ${
            role === "assistant" ? "text-blue-500" : "text-slate-400"
          }`}>
            {t(style.label)}
          </span>
        )}
        {agentLabel && (
          <span className={`block text-[10px] font-bold mb-0.5 ${undelivered ? "text-slate-500" : "text-white/60"}`}>
            {agentLabel}
          </span>
        )}
        {doc && (mediaUrl || pending) ? (
          <a
            href={mediaUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={t("openDocument")}
            className={`mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${
              role === "agent" ? "bg-white/10 hover:bg-white/15" : "bg-slate-100 hover:bg-slate-200"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate">{doc.filename}</span>
            {pending && <Spinner className="ml-auto" />}
          </a>
        ) : mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="relative block mb-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL efímera, no optimizable por next/image */}
            <img
              src={mediaUrl}
              alt={t("imageAlt")}
              className="max-h-64 rounded-lg object-cover"
              loading="lazy"
              onLoad={() => setImgFailed(false)}
              onError={() => setImgFailed(true)}
            />
            {pending && (
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-navy-900/40">
                <Spinner className="h-6 w-6" />
              </span>
            )}
          </a>
        )}
        {reaction ? (
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            {reaction.emoji && <span className="text-xl leading-none">{reaction.emoji}</span>}
            <span className="italic">{t(reaction.removed ? "reactionRemoved" : "reacted")}</span>
          </p>
        ) : doc && (mediaUrl || pending) ? (
          doc.caption && <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{doc.caption}</p>
        ) : (
          !(mediaUrl && !imgFailed && isMediaPlaceholder) && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{content}</p>
          )
        )}
        <span className={`flex items-center gap-1 text-[10px] mt-1 ${
          role === "agent" && !undelivered ? "text-white/50" : "text-slate-400"
        }`}>
          {createdAt}
          {role === "agent" && delivery && <Ticks status={delivery} label={tD(delivery)} />}
          {undelivered && (
            <span className="inline-flex items-center gap-1 font-bold text-red-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              {tD("failed")}
            </span>
          )}
          {pending && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          )}
          {failed && <span className="text-red-300">{t("failed")}</span>}
        </span>
      </div>
    </div>
    {undelivered && (
      <div role="alert" className="mt-1.5 w-full max-w-[75%] rounded-xl border border-red-200 bg-white px-3 py-2.5 shadow-sm">
        <p className="text-xs font-bold text-red-700">{tD(`titles.${reason}`)}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{tD(`reasons.${reason}`)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {reason === "payment" &&
            (userRole === "admin" ? (
              <Link href="/settings/whatsapp#billing" className="inline-flex h-7 items-center rounded-lg bg-navy-900 px-2.5 text-[11px] font-bold text-white hover:bg-navy-800">
                {tD("addPayment")}
              </Link>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500">{tD("askAdmin")}</span>
            ))}
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(content);
                toast.success(tD("copied"));
              } catch {
                toast.error(tD("copyFailed"));
              }
            }}
            className="inline-flex h-7 items-center rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
          >
            {tD("copy")}
          </button>
          {errorCode != null && <span className="ml-auto text-[10px] tabular-nums text-slate-400">{tD("code", { code: errorCode })}</span>}
        </div>
      </div>
    )}
    </div>
  );
}
