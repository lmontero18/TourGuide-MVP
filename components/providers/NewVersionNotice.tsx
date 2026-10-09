"use client";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useNewVersion } from "@/hooks/useNewVersion";
import { useAuth } from "@/hooks/useAuth";
import { CHANGELOG } from "@/lib/changelog";

// Aviso persistente cuando subimos una version nueva de Tourfy, con boton
// para recargar (asi nadie se queda con errores ya arreglados). Si la version
// trae una novedad que este cliente no conoce, el aviso la nombra.
export default function NewVersionNotice() {
  const t = useTranslations("dashboard.newVersion");
  const locale = useLocale();
  const { role } = useAuth();
  useNewVersion((latest) => {
    const isNew = latest && !CHANGELOG.some((e) => e.id === latest.id) && (!latest.adminOnly || role === "admin");
    toast(isNew ? t("featureTitle", { title: locale === "en" ? latest.en : latest.es }) : t("title"), {
      id: "new-version",
      description: isNew ? t("featureBody") : t("body"),
      duration: Infinity,
      action: { label: t("reload"), onClick: () => window.location.reload() },
    });
  });
  return null;
}
