"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ORG_LOGO_MAX_BYTES, ORG_LOGO_TYPES, orgInitials, orgLogoUrl } from "@/lib/orgLogo";

// Logo de la agencia en Configuracion (flag orgBranding). Se guarda al elegir
// el archivo, aparte del boton "Guardar" del formulario, y el menu lo muestra
// al instante.
export default function OrgLogoField({ orgName }: { orgName: string }) {
  const t = useTranslations("dashboard.settings.org");
  const tErr = useTranslations("apiErrors");
  const { orgLogoPath, setOrgBranding } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const logoUrl = orgLogoUrl(orgLogoPath);

  const upload = async (file: File) => {
    // Mismo chequeo que el server, para no subir 4 MB y que lo rechace.
    if (!ORG_LOGO_TYPES.includes(file.type)) return toast.error(tErr("logoType"));
    if (file.size > ORG_LOGO_MAX_BYTES) return toast.error(tErr("logoTooLarge"));
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/organizations/logo", { method: "POST", body });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? tErr("logoSaveFailed"));
      setOrgBranding({ logoPath: result.logo_path });
      toast.success(t("logoSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr("logoSaveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/organizations/logo", { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? tErr("logoSaveFailed"));
      setOrgBranding({ logoPath: null });
      toast.success(t("logoRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr("logoSaveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("logo")}</label>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo subido por la agencia, URL publica de Supabase
          <img src={logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-base font-bold text-white">
            {orgInitials(orgName)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {logoUrl ? t("logoChange") : t("logoUpload")}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50"
              >
                {t("logoRemove")}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">{t("logoHint")}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={ORG_LOGO_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
      </div>
    </div>
  );
}
