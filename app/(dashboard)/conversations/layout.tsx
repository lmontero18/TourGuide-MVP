"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ConversationList from "@/components/conversations/ConversationList";
import InboxList from "@/components/conversations/InboxList";
import TopBar from "@/components/layout/TopBar";
import { hasFeature } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";

// La lista vive en el layout, no en cada pagina: Next no re-monta los layouts
// al navegar entre rutas hijas, asi que pasar de una conversacion a otra solo
// cambia el panel derecho. Antes cada click re-montaba la lista, que volvia a
// pedir todas las conversaciones y reabria su canal de realtime.
export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard.conversations");
  const params = useParams<{ id?: string }>();
  const activeId = params.id;
  // Con la ficha fija a la derecha (flag leadPanel) la lista se angosta para
  // que el chat no quede apretado en una laptop.
  const { featureFlags } = useAuth();
  const narrowList = hasFeature(featureFlags, "leadPanel");

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")} />
      <div className="flex flex-1 overflow-hidden">
        {/* En mobile, con una conversacion abierta se ve solo el chat */}
        <div
          className={`w-full border-slate-200 bg-white overflow-hidden lg:max-w-md lg:border-r ${narrowList ? "xl:max-w-sm" : ""} ${
            activeId ? "hidden lg:block" : ""
          }`}
        >
          {/* Prueba del diseno nuevo de la bandeja (flag inboxPreview) */}
          {hasFeature(featureFlags, "inboxPreview") ? <InboxList activeId={activeId} /> : <ConversationList activeId={activeId} />}
        </div>
        {/* Sin conversacion abierta, en el celular solo se ve la lista */}
        <div className={`flex-1 overflow-hidden ${activeId ? "" : "hidden lg:block"}`}>{children}</div>
      </div>
    </div>
  );
}
