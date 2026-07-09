"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import SettingsSkeleton from "@/components/settings/SettingsSkeleton";
import type { Organization } from "@/types";

const DEFAULT_HOURS = { start: "09:00", end: "18:00" };

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState("America/Lima");
  const [hoursStart, setHoursStart] = useState(DEFAULT_HOURS.start);
  const [hoursEnd, setHoursEnd] = useState(DEFAULT_HOURS.end);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/organizations");
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to load");
        const org = result.organization as Organization;
        setOrgName(org.name);
        setTimezone(org.bot_config?.timezone ?? "America/Lima");
        setHoursStart(org.bot_config?.business_hours?.start ?? DEFAULT_HOURS.start);
        setHoursEnd(org.bot_config?.business_hours?.end ?? DEFAULT_HOURS.end);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!orgName.trim()) {
      toast.error("Agency name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          bot_config: {
            timezone,
            business_hours: { start: hoursStart, end: hoursEnd },
          },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save");
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Settings">
        <Link
          href="/settings/whatsapp"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          WhatsApp
        </Link>
        <Link
          href="/settings/agents"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" /><path d="M23 11h-6" />
          </svg>
          Manage agents
        </Link>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <SettingsSkeleton />
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* Organization */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-navy-900 mb-4">Organization</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">Agency name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <div>
                    <label className="block text-xs font-medium text-navy-900 mb-1.5">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      <option value="America/Lima">America/Lima (UTC-5)</option>
                      <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                      <option value="America/Bogota">America/Bogota (UTC-5)</option>
                      <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                      <option value="America/Costa_Rica">America/Costa_Rica (UTC-6)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Business hours */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-navy-900 mb-1">Business hours</h2>
              <p className="text-xs text-slate-400 mb-4">Messages outside these hours are marked as after-hours in your metrics.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">Opens at</label>
                  <input
                    type="time"
                    value={hoursStart}
                    onChange={(e) => setHoursStart(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">Closes at</label>
                  <input
                    type="time"
                    value={hoursEnd}
                    onChange={(e) => setHoursEnd(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Save */}
            <div className="flex justify-end pb-8">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
