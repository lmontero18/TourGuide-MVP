"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import TopBar from "@/components/layout/TopBar";

const TABS = [
  { key: "general", href: "/settings" },
  { key: "whatsapp", href: "/settings/whatsapp" },
  { key: "emails", href: "/settings/emails" },
  { key: "billing", href: "/settings/billing" },
] as const;

interface SettingsShellProps {
  children: React.ReactNode;
}

// Estructura comun de Configuracion: TopBar + tabs por ruta + area con scroll.
// Cada tab es su propia ruta (con su loading.tsx), asi el link se puede
// compartir y el back del navegador funciona.
export default function SettingsShell({ children }: SettingsShellProps) {
  const t = useTranslations("dashboard.settings");
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")} />
      <nav aria-label={t("title")} className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-5">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                active ? "border-navy-900 text-navy-900" : "border-transparent text-slate-500 hover:text-navy-900"
              }`}
            >
              {t(`tabs.${tab.key}`)}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
