"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

// Piezas compartidas entre los previews animados del landing (Hero, HowItWorks).

/** Revela un bloque en un momento de la linea de tiempo de la animacion. */
export function Reveal({
  at,
  children,
  className,
  pop = false,
}: {
  at: number;
  children: ReactNode;
  className?: string;
  pop?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: pop ? 0.96 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: at, duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Burbuja de chat con texto real. left = cliente, right = bot. */
export function Bubble({ side, text }: { side: "left" | "right"; text: string }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed border shadow-sm ${
          side === "right"
            ? "rounded-tr-sm bg-blue-500/10 border-blue-200/40 text-navy-900"
            : "rounded-tl-sm bg-white border-slate-200/60 text-slate-700"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

/** Indicador de "escribiendo" que aparece y desaparece dentro de la linea de tiempo. */
export function TypingDots({
  at,
  duration = 1.1,
  side = "right",
}: {
  at: number;
  duration?: number;
  side?: "left" | "right";
}) {
  return (
    <motion.div
      className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, height: "0px" }}
      animate={{ opacity: [0, 1, 1, 0], height: ["0px", "auto", "auto", "0px"] }}
      transition={{ delay: at, duration, times: [0, 0.15, 0.85, 1] }}
    >
      <div
        className={`rounded-xl px-2.5 py-2 flex items-center gap-1 border ${
          side === "right"
            ? "rounded-tr-sm bg-blue-500/10 border-blue-200/40"
            : "rounded-tl-sm bg-white border-slate-200/60"
        }`}
      >
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="block h-1.5 w-1.5 rounded-full bg-blue-400/60"
            style={{ animation: `pulse-dot 1.4s ${d * 0.2}s infinite` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
