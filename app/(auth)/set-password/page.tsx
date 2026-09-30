"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setPassword } from "./actions";

// Destino de los links de invitación y de recuperación de contraseña
// (/auth/confirm?type=invite|recovery&next=/set-password).
export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("auth.setPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace("/set-password", { scroll: false });
    }
  }, [error, router]);

  const inputClass =
    "w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("sub")}</p>

      <form className="mt-8 space-y-4" action={setPassword}>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-navy-900 mb-1.5">
            {t("password")}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={t("toggle")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">{t("rules")}</p>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-navy-900 mb-1.5">
            {t("confirm")}
          </label>
          <input
            id="confirm"
            name="confirm"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <SubmitButton label={t("submit")} />
      </form>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-xl bg-navy-900 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}
