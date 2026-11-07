"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import ProLock from "@/components/ui/ProLock";
import { useAuth } from "@/hooks/useAuth";
import { hasProFeature, type ProFeature } from "@/lib/features";

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
export function ProLockFor({ feature, variant = "panel", copyKey }: { feature: ProFeature; variant?: "panel" | "inline"; copyKey?: "ficha" | "teamSales" }) {
  const t = useTranslations("dashboard.proLock");
  const { role, orgName } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  // "Pasar a Pro" le avisa al equipo de Tourfy desde la app, por el mismo
  // camino que el feedback (correo a FEEDBACK_EMAIL): no depende de que la
  // persona tenga una app de correo. Solo el admin decide el plan.
  const request = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "other",
          message: t("message", { agency: orgName ?? "", feature: t(`features.${feature}.title`) }),
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
    } catch {
      setState("idle");
      toast.error(t("error"));
    }
  };
  const cta = role === "admin" ? { label: t("cta"), onClick: () => void request(), busy: state === "sending" } : undefined;
  return (
    <ProLock
      badge={t("badge")}
      title={t(`${copyKey ?? `features.${feature}`}.title`)}
      description={t(`${copyKey ?? `features.${feature}`}.description`)}
      cta={cta}
      hint={t("askAdmin")}
      done={state === "sent" ? t("sent") : undefined}
      variant={variant}
    />
  );
}
