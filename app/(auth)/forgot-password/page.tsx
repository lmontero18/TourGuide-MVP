"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const t = useTranslations("auth.forgot");

  if (sent) {
    return (
      <div className="text-center">
        {/* Check icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
          {t("sentTitle")}
        </h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
          {t("sentSub")}
        </p>

        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
        >
          {t("resend")}
        </button>

        <p className="mt-8 text-sm text-slate-500">
          <Link
            href="/login"
            className="font-semibold text-navy-900 hover:text-navy-700 transition-colors inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        {t("back")}
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("sub")}</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
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
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full h-11 rounded-xl bg-navy-900 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
        >
          {t("submit")}
        </button>
      </form>
    </div>
  );
}
