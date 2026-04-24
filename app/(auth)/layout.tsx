"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth.panel");
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative bg-navy-950 overflow-hidden">
        {/* Gradient mesh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 30%, rgba(59,130,246,0.08) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 transition-transform group-hover:scale-105">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              TourGuide
            </span>
          </Link>

          {/* Middle — testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-sm"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                {t("badge")}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <blockquote className="font-display text-2xl xl:text-3xl font-bold text-white leading-snug tracking-tight">
              {t("quote")}
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <span className="text-xs font-bold text-white/60">MR</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  {t("quoteName")}
                </p>
                <p className="text-sm text-white/40">
                  {t("quoteRole")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Bottom stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex gap-8"
          >
            {[
              { value: "3×", key: "statMoreLeads" as const },
              { value: "<2s", key: "statReplyTime" as const },
              { value: "24/7", key: "statAvailability" as const },
            ].map((stat) => (
              <div key={stat.key}>
                <p className="font-display text-2xl font-extrabold text-white tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{t(stat.key)}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="font-display text-base font-bold tracking-tight text-navy-900">
              TourGuide
            </span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[400px]"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
