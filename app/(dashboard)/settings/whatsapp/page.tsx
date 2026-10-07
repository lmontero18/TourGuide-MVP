"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import SettingsShell from "@/components/settings/SettingsShell";
import { useWhatsAppAccount } from "@/hooks/useWhatsAppAccount";
import { queryKeys } from "@/lib/query/keys";
import ConnectWhatsAppButton from "@/components/whatsapp/ConnectWhatsAppButton";
import BillingCard from "@/components/whatsapp/BillingCard";
import WhatsAppSettingsSkeleton from "@/components/skeletons/WhatsAppSettingsSkeleton";

export default function WhatsAppSettingsPage() {
  const t = useTranslations("dashboard.settings.whatsapp");
  const queryClient = useQueryClient();
  const { data: account = null, isPending: loading, refetch } = useWhatsAppAccount();
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const loadAccount = () => refetch();

  const handleConnect = async () => {
    if (!wabaId.trim() || !phoneNumberId.trim() || !accessToken.trim()) {
      toast.error(t("errors.missingFields"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/whatsapp/connect-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waba_id: wabaId.trim(),
          phone_number_id: phoneNumberId.trim(),
          access_token: accessToken.trim(),
          phone_number: phoneNumber.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? t("errors.connect"));
      await loadAccount();
      toast.success(t("connectedToast"));
      setWabaId("");
      setPhoneNumberId("");
      setAccessToken("");
      setPhoneNumber("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.connect"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t("disconnectConfirm"))) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? t("errors.disconnect"));
      queryClient.setQueryData(queryKeys.whatsappAccount, null);
      toast.success(t("disconnectedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.disconnect"));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <SettingsShell>
        {loading ? <WhatsAppSettingsSkeleton /> : (
        <div className="space-y-6">
          {account ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-navy-900 mb-4">{t("connectedNumber")}</h2>
              <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900">{t("connected")}</p>
                    <p className="text-xs text-green-700/70">{account.phone_number || "—"}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-xs font-medium text-green-600 hover:text-green-700 underline underline-offset-2 transition-colors disabled:opacity-50"
                >
                  {disconnecting ? t("disconnecting") : t("disconnect")}
                </button>
              </div>
            </section>
          ) : null}

          {!loading && account?.waba_id && (
            <BillingCard wabaId={account.waba_id} paymentFailedAt={account.payment_failed_at} />
          )}

          {!loading && !account && (
            <>
            {/* Acción primaria: conectar con un clic vía Embedded Signup */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-navy-900 mb-1">{t("connectTitle")}</h2>
              <p className="text-xs text-slate-400 mb-4">
                {t("connectSub")}
              </p>
              <ConnectWhatsAppButton onConnected={() => { void loadAccount(); }} />
            </section>

            {/* Fallback avanzado: conexión manual con credenciales de Meta */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                type="button"
                onClick={() => setShowManual((s) => !s)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-navy-900">{t("manualTitle")}</span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-slate-400 transition-transform ${showManual ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {showManual && (
              <div className="mt-4">
              <p className="text-xs text-slate-400 mb-4">
                {t("manualSub")}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("wabaId")}</label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="1234567890123456"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("phoneNumberId")}</label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="9876543210987654"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("accessToken")}</label>
                  <textarea
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAJZC..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono resize-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {t("accessTokenHint")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">
                    {t("displayPhone")} <span className="text-slate-400 font-normal">({t("optional")})</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleConnect}
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {submitting ? t("connecting") : t("connectTitle")}
                </button>
              </div>
              </div>
              )}
            </section>
            </>
          )}
        </div>
        )}
    </SettingsShell>
  );
}
