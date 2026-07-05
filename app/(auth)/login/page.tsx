"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace("/login", { scroll: false });
    }
  }, [error, router]);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("sub")}</p>

      <form className="mt-8 space-y-4" onSubmit={() => setLoading(true)}>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-navy-900 mb-1.5"
          >
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-navy-900"
            >
              {t("password")}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              {t("forgot")}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder={t("passwordPlaceholder")}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          formAction={login}
          disabled={loading}
          className="w-full h-11 rounded-xl bg-navy-900 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? `${t("submit")}...` : t("submit")}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-8 text-center text-sm text-slate-500">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-semibold text-navy-900 hover:text-navy-700 transition-colors"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
