import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LoadingRegionProps {
  /** Texto para lectores de pantalla. Por defecto `dashboard.common.loading`. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}

// Contenedor accesible de un skeleton: anuncia "Cargando…" una sola vez y deja
// los bloques visuales fuera del arbol de accesibilidad (Skeleton es aria-hidden).
// Sin "use client": sirve en loading.tsx (server) y dentro de paginas cliente.
export default function LoadingRegion({ label, className, children }: LoadingRegionProps) {
  const t = useTranslations("dashboard.common");
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn(className)}>
      <span className="sr-only">{label ?? t("loading")}</span>
      {children}
    </div>
  );
}
