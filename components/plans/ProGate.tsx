"use client";

import { useTranslations } from "next-intl";
import ProLock from "@/components/ui/ProLock";
import { useAuth } from "@/hooks/useAuth";
import { hasProFeature, type ProFeature } from "@/lib/features";
import { demoLink } from "@/lib/marketing/demoLink";

interface ProGateProps {
  feature: ProFeature;
  variant?: "panel" | "inline";
  children: React.ReactNode;
}

// Muestra `children` si la org tiene la funcion; si es Starter, el candado.
// Es solo la parte visible: la API route de la funcion chequea el plan igual.
export default function ProGate({ feature, variant = "panel", children }: ProGateProps) {
  const { featureFlags } = useAuth();
  if (hasProFeature(featureFlags, feature)) return <>{children}</>;
  return <ProLockFor feature={feature} variant={variant} />;
}

// copyKey: textos propios para un lugar puntual (ej. "ficha" en el chat); sin
// el, los de la funcion.
export function ProLockFor({ feature, variant = "panel", copyKey }: { feature: ProFeature; variant?: "panel" | "inline"; copyKey?: "ficha" }) {
  const t = useTranslations("dashboard.proLock");
  const { role, orgName } = useAuth();
  // Solo el admin decide el plan: el agente ve a quien pedirselo.
  const cta = role === "admin"
    ? { label: t("cta"), ...demoLink(t("message", { agency: orgName ?? "" }), t("subject")) }
    : undefined;
  return (
    <ProLock
      badge={t("badge")}
      title={t(`${copyKey ?? `features.${feature}`}.title`)}
      description={t(`${copyKey ?? `features.${feature}`}.description`)}
      cta={cta}
      hint={t("askAdmin")}
      variant={variant}
    />
  );
}
