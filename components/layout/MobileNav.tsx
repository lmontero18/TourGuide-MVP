"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useConversationsContext } from "@/components/providers/ConversationsProvider";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import { NAV_ITEMS } from "@/components/layout/Sidebar";

// Navegacion del celular (debajo de md): barra fija abajo con las 4 secciones
// principales y "Mas" con el resto. En la compu se usa el Sidebar.
const PRIMARY = 4;

export default function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("dashboard.sidebar");
  const { role } = useAuth();
  const { unreadTotal } = useConversationsContext();
  // Abierto "en" una ruta: al navegar se cierra solo, sin efecto.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const moreOpen = openAt === pathname;
  const setMoreOpen = (open: boolean) => setOpenAt(open ? pathname : null);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role !== "agent");
  const primary = items.slice(0, PRIMARY);
  const rest = items.slice(PRIMARY);
  const activeHref = items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const restActive = rest.some((item) => item.href === activeHref);

  const tab = "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold";

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)} aria-hidden>
          <div className="absolute inset-0 bg-navy-950/30" />
        </div>
      )}
      {moreOpen && (
        <div
          role="menu"
          aria-label={t("more")}
          className="fixed inset-x-3 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl md:hidden"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)" }}
        >
          {rest.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                item.href === activeHref ? "bg-navy-900/5 text-navy-900" : "text-slate-600"
              }`}
            >
              {item.icon}
              {t(item.key)}
            </Link>
          ))}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <FeedbackButton collapsed={false} />
          </div>
        </div>
      )}
      <nav
        aria-label={t("menu")}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden"
        style={{ height: "calc(3.5rem + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link key={item.href} href={item.href} className={`${tab} ${active ? "text-navy-900" : "text-slate-400"}`}>
              <span className="relative">
                {item.icon}
                {item.key === "conversations" && unreadTotal > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{t(item.key)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          className={`${tab} ${moreOpen || restActive ? "text-navy-900" : "text-slate-400"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" />
          </svg>
          {t("more")}
        </button>
      </nav>
    </>
  );
}
