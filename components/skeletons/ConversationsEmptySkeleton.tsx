import { useTranslations } from "next-intl";
import LoadingRegion from "./LoadingRegion";

/**
 * Panel derecho de /conversations sin conversacion elegida. Es contenido
 * estatico, asi que se muestra tal cual (mismo markup que conversations/page)
 * y el cambio a la pagina real no se nota.
 */
export default function ConversationsEmptySkeleton() {
  const t = useTranslations("dashboard.conversations");
  return (
    <LoadingRegion className="flex h-full items-center justify-center bg-slate-50">
      <div className="text-center" aria-hidden>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="font-display text-lg font-bold text-navy-900">{t("empty.title")}</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">{t("empty.sub")}</p>
      </div>
    </LoadingRegion>
  );
}
