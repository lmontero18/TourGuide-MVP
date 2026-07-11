"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import SettingsSkeleton from "@/components/settings/SettingsSkeleton";
import { DEFAULT_RANGE, normalizeBusinessHours } from "@/lib/bot/businessHours";
import type { Organization } from "@/types";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState("America/Lima");
  const [weekdaysStart, setWeekdaysStart] = useState(DEFAULT_RANGE.start);
  const [weekdaysEnd, setWeekdaysEnd] = useState(DEFAULT_RANGE.end);
  const [weekendClosed, setWeekendClosed] = useState(false);
  const [weekendStart, setWeekendStart] = useState(DEFAULT_RANGE.start);
  const [weekendEnd, setWeekendEnd] = useState(DEFAULT_RANGE.end);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/organizations");
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to load");
        const org = result.organization as Organization;
        setOrgName(org.name);
        setTimezone(org.bot_config?.timezone ?? "America/Lima");
        const hours = normalizeBusinessHours(org.bot_config?.business_hours);
        setWeekdaysStart(hours.weekdays.start);
        setWeekdaysEnd(hours.weekdays.end);
        setWeekendClosed(hours.weekend === null);
        setWeekendStart(hours.weekend?.start ?? DEFAULT_RANGE.start);
        setWeekendEnd(hours.weekend?.end ?? DEFAULT_RANGE.end);
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
            business_hours: {
              weekdays: { start: weekdaysStart, end: weekdaysEnd },
              weekend: weekendClosed ? null : { start: weekendStart, end: weekendEnd },
            },
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

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-navy-900 mb-2">Weekdays (Mon–Fri)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-navy-900 mb-1.5">Opens at</label>
                      <input
                        type="time"
                        value={weekdaysStart}
                        onChange={(e) => setWeekdaysStart(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-navy-900 mb-1.5">Closes at</label>
                      <input
                        type="time"
                        value={weekdaysEnd}
                        onChange={(e) => setWeekdaysEnd(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-navy-900">Weekend (Sat–Sun)</p>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={weekendClosed}
                        onChange={(e) => setWeekendClosed(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      Closed on weekends
                    </label>
                  </div>
                  {!weekendClosed && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-navy-900 mb-1.5">Opens at</label>
                        <input
                          type="time"
                          value={weekendStart}
                          onChange={(e) => setWeekendStart(e.target.value)}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-navy-900 mb-1.5">Closes at</label>
                        <input
                          type="time"
                          value={weekendEnd}
                          onChange={(e) => setWeekendEnd(e.target.value)}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  )}
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
