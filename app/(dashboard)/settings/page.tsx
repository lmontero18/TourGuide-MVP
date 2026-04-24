"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import TopBar from "@/components/layout/TopBar";

export default function SettingsPage() {
  const t = useTranslations("dashboard.settings");
  const [orgName, setOrgName] = useState("Cusco Expeditions");
  const [language, setLanguage] = useState("es");
  const [timezone, setTimezone] = useState("America/Lima");
  const [hoursStart, setHoursStart] = useState("09:00");
  const [hoursEnd, setHoursEnd] = useState("18:00");
  const [prompt, setPrompt] = useState(
    "You are a friendly travel assistant for Cusco Expeditions. Help customers learn about our tours, pricing, and availability. Be warm and helpful. If a customer wants to make a booking or has a complex question, offer to connect them with a human agent."
  );
  const [tone, setTone] = useState<"formal" | "friendly" | "casual">("friendly");

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")}>
        <Link
          href="/settings/agents"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" /><path d="M23 11h-6" />
          </svg>
          {t("manageAgents")}
        </Link>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl space-y-6">
          {/* Organization */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-navy-900 mb-4">{t("org.title")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("org.name")}</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("org.language")}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="es">Espanol</option>
                    <option value="en">English</option>
                    <option value="pt">Portugues</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("org.timezone")}</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Business hours */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-navy-900 mb-1">{t("hours.title")}</h2>
            <p className="text-xs text-slate-400 mb-4">{t("hours.sub")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("hours.opens")}</label>
                <input
                  type="time"
                  value={hoursStart}
                  onChange={(e) => setHoursStart(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("hours.closes")}</label>
                <input
                  type="time"
                  value={hoursEnd}
                  onChange={(e) => setHoursEnd(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Bot config */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-navy-900 mb-1">{t("bot.title")}</h2>
            <p className="text-xs text-slate-400 mb-4">{t("bot.sub")}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("bot.tone")}</label>
                <div className="flex gap-2">
                  {(["formal", "friendly", "casual"] as const).map((toneKey) => (
                    <button
                      key={toneKey}
                      onClick={() => setTone(toneKey)}
                      className={`flex-1 h-9 rounded-lg border text-xs font-medium capitalize transition-all ${
                        tone === toneKey
                          ? "border-navy-900 bg-navy-900/5 text-navy-900 ring-2 ring-navy-900/10"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {t(`bot.${toneKey}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("bot.prompt")}</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>
            </div>
          </section>

          {/* WhatsApp connection */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-navy-900 mb-4">{t("whatsapp.title")}</h2>
            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-500" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">{t("whatsapp.connected")}</p>
                  <p className="text-xs text-green-700/70">+52 55 1234 5678</p>
                </div>
              </div>
              <button className="text-xs font-medium text-green-600 hover:text-green-700 underline underline-offset-2 transition-colors">
                {t("whatsapp.disconnect")}
              </button>
            </div>
          </section>

          {/* Save */}
          <div className="flex justify-end pb-8">
            <button className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
              {t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
