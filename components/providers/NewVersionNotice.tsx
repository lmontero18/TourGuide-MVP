"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useNewVersion } from "@/hooks/useNewVersion";

// Aviso persistente cuando subimos una version nueva de Tourfy, con boton
// para recargar (asi nadie se queda con errores ya arreglados).
export default function NewVersionNotice() {
  const t = useTranslations("dashboard.newVersion");
  useNewVersion(() => {
    toast(t("title"), {
      id: "new-version",
      description: t("body"),
      duration: Infinity,
      action: { label: t("reload"), onClick: () => window.location.reload() },
    });
  });
  return null;
}
