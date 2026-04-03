"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "./i18n";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, locale, toggle } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ease-out ${
        scrolled || mobileOpen
          ? "bg-white/70 backdrop-blur-xl border-b border-slate-200/30"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-navy-900 transition-transform group-hover:scale-105">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-navy-900">
              TourGuide
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors">
              {t("nav.features")}
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors">
              {t("nav.howItWorks")}
            </a>
            <a href="#metrics" className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors">
              {t("nav.results")}
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle — always visible */}
            <button
              onClick={toggle}
              className="inline-flex h-7 sm:h-8 items-center justify-center rounded-md border border-slate-200 px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-navy-900 hover:border-slate-300 transition-colors tracking-wide"
            >
              {locale === "en" ? "ES" : "EN"}
            </button>

            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors hidden md:block"
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex h-8 sm:h-9 items-center rounded-lg bg-navy-900 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lg hover:shadow-navy-900/20 active:scale-[0.98]"
            >
              {t("nav.cta")}
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? (
                  <>
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </>
                ) : (
                  <>
                    <path d="M4 8h16" />
                    <path d="M4 16h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/30"
          >
            <div className="px-5 py-4 space-y-1">
              {[
                { href: "#features", label: t("nav.features") },
                { href: "#how-it-works", label: t("nav.howItWorks") },
                { href: "#metrics", label: t("nav.results") },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 text-sm font-medium text-slate-600 hover:text-navy-900 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center justify-center rounded-lg bg-navy-900 text-sm font-semibold text-white"
                >
                  {t("nav.cta")}
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600"
                >
                  {t("nav.login")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
