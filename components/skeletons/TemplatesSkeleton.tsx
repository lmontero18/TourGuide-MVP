import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "./LoadingRegion";
import { TextLines } from "./primitives";

/** Una plantilla: info a la izquierda + vista previa estilo WhatsApp a la derecha. */
export function TemplateCardSkeleton({ nameWidth = "w-40" }: { nameWidth?: string }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${nameWidth}`} /></div>
          <Skeleton className="h-[18px] w-16 rounded-full" />
          <Skeleton className="h-[18px] w-14 rounded-full" />
          <Skeleton className="h-2.5 w-6" />
        </div>
        <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-48" /></div>
        <div className="flex h-5 items-center pt-1"><Skeleton className="h-2.5 w-12" /></div>
      </div>
      {/* Vista previa (fondo de chat de WhatsApp) */}
      <div className="rounded-2xl bg-[#e9e2d8] p-4">
        <div className="max-w-[300px] space-y-1.5 rounded-lg rounded-tl-none bg-white px-3 pb-1.5 pt-2.5 shadow-sm">
          <Skeleton className="h-3 w-3/5 bg-slate-200" />
          <Skeleton className="h-2.5 w-full bg-slate-200/80" />
          <Skeleton className="h-2.5 w-11/12 bg-slate-200/80" />
          <Skeleton className="h-2.5 w-2/3 bg-slate-200/80" />
          <div className="flex justify-end pt-0.5"><Skeleton className="h-2 w-7 bg-slate-200/80" /></div>
        </div>
      </div>
    </div>
  );
}

/** Contenido de /templates debajo del TopBar (dentro del area `p-5` con scroll). */
export default function TemplatesSkeleton() {
  const t = useTranslations("dashboard.templates");
  return (
    <LoadingRegion label={t("loading")} className="mx-auto max-w-5xl space-y-5">
      <TextLines widths={["w-full", "w-full", "w-1/4"]} className="max-w-2xl" />

      {/* Plantillas de arranque */}
      <section>
        <div className="mb-2 flex h-4 items-center"><Skeleton className="h-2.5 w-32" /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["w-32", "w-28", "w-36"].map((w, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${w}`} /></div>
              <TextLines widths={["w-full", "w-full", "w-3/5"]} lineClassName="h-4" barClassName="h-2.5" className="mt-1" />
              <div className="mt-2 flex h-4 items-center"><Skeleton className="h-2.5 w-20" /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <TemplateCardSkeleton nameWidth="w-40" />
        <TemplateCardSkeleton nameWidth="w-32" />
      </div>
    </LoadingRegion>
  );
}
