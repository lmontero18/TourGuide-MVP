"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </AuthProvider>
  );
}
