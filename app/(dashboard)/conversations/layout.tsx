"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ConversationList from "@/components/conversations/ConversationList";
import TopBar from "@/components/layout/TopBar";

// La lista vive en el layout, no en cada pagina: Next no re-monta los layouts
// al navegar entre rutas hijas, asi que pasar de una conversacion a otra solo
// cambia el panel derecho. Antes cada click re-montaba la lista, que volvia a
// pedir todas las conversaciones y reabria su canal de realtime.
export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard.conversations");
  const params = useParams<{ id?: string }>();
  const activeId = params.id;

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")} />
      <div className="flex flex-1 overflow-hidden">
        {/* En mobile, con una conversacion abierta se ve solo el chat */}
        <div
          className={`w-full max-w-md border-r border-slate-200 bg-white overflow-hidden ${
            activeId ? "hidden lg:block" : ""
          }`}
        >
          <ConversationList activeId={activeId} />
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
