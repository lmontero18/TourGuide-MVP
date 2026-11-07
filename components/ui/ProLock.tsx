"use client";

// Candado "Disponible en Pro" (CODE-202). Solo presenta: quien lo usa decide si
// la org es Starter y le pasa los textos ya traducidos. En Starter las
// funciones de Pro se ven con este candado en vez de esconderse.

interface ProLockProps {
  badge: string;
  title: string;
  description: string;
  // Sin cta (por ejemplo, un agente): se muestra el hint en su lugar.
  cta?: { label: string; href: string; external: boolean };
  hint?: string;
  // "panel": ocupa el lugar de una pantalla o pestaña. "inline": una tarjeta
  // chica dentro de otra pantalla (ficha, Configuracion).
  variant?: "panel" | "inline";
}

export function LockIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function ProLock({ badge, title, description, cta, hint, variant = "panel" }: ProLockProps) {
  const panel = variant === "panel";
  return (
    <section
      aria-label={title}
      className={
        panel
          ? "mx-auto flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center"
          : "flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      }
    >
      <span className={`inline-flex items-center gap-1 rounded-full bg-navy-900 px-2 py-0.5 text-[11px] font-bold text-white ${panel ? "" : "self-start"}`}>
        <LockIcon size={11} />
        {badge}
      </span>
      <h2 className={panel ? "mt-4 font-display text-xl font-bold text-navy-900" : "text-sm font-bold text-navy-900"}>{title}</h2>
      <p className={panel ? "mt-2 text-sm text-slate-500" : "text-[13px] text-slate-500"}>{description}</p>
      {cta ? (
        <a
          href={cta.href}
          target={cta.external ? "_blank" : undefined}
          rel={cta.external ? "noopener noreferrer" : undefined}
          className={`inline-flex items-center justify-center rounded-lg bg-navy-900 font-semibold text-white hover:bg-navy-800 ${
            panel ? "mt-6 h-10 px-5 text-sm" : "h-8 self-start px-3 text-xs"
          }`}
        >
          {cta.label}
        </a>
      ) : (
        hint && <p className={`text-xs text-slate-400 ${panel ? "mt-6" : ""}`}>{hint}</p>
      )}
    </section>
  );
}
