import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "./LoadingRegion";

/**
 * Contenido de /settings/whatsapp mientras carga. Asume el caso comun (numero
 * conectado + tarjeta de facturacion), que es donde el salto se notaria mas.
 */
export default function WhatsAppSettingsSkeleton() {
  const t = useTranslations("dashboard.settings.whatsapp");
  return (
    <LoadingRegion label={t("loading")} className="max-w-2xl space-y-6">
      {/* Numero conectado */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex h-5 items-center"><Skeleton className="h-3.5 w-36" /></div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-24" /></div>
              <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-28" /></div>
            </div>
          </div>
          <Skeleton className="h-2.5 w-20" />
        </div>
      </section>

      {/* Facturacion */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-28" /></div>
        <div className="mb-4 mt-1 flex h-4 items-center"><Skeleton className="h-2.5 w-72 max-w-full" /></div>
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-64 max-w-full" />
        </div>
        <div className="mt-4 flex h-4 items-center"><Skeleton className="h-2.5 w-32" /></div>
        <div className="mt-1.5 space-y-2 pl-4">
          {["w-3/4", "w-2/3", "w-1/2"].map((w, i) => (
            <Skeleton key={i} className={`h-2.5 ${w}`} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </section>
    </LoadingRegion>
  );
}
