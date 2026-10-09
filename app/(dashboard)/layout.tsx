"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ConversationsProvider } from "@/components/providers/ConversationsProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import NewVersionNotice from "@/components/providers/NewVersionNotice";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // En el celular el chat abierto ocupa toda la pantalla (como WhatsApp): sin
  // barra de abajo, que taparia el campo para escribir.
  const inChat = /^\/conversations\/[^/]+/.test(usePathname());

  return (
    <QueryProvider>
    <AuthProvider>
      <ConversationsProvider>
        <div className="flex h-dvh overflow-hidden bg-slate-50">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          <main
            className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
              inChat ? "" : "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
            }`}
          >
            {children}
          </main>
          {!inChat && <MobileNav />}
          <NewVersionNotice />
        </div>
      </ConversationsProvider>
    </AuthProvider>
    </QueryProvider>
  );
}
