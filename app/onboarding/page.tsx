"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import ConnectWhatsAppButton from "@/components/whatsapp/ConnectWhatsAppButton";
import TourCards, { type FaqDraft } from "@/components/tours/TourCards";
import { importFromUrl, importFromFiles, type ImportResult } from "@/lib/import/client";
import type { BusinessSection, Tour } from "@/types";

/* ─── Types ─── */
interface OnboardingData {
  agencyName: string;
  country: string;
  whatsappConnected: boolean;
  whatsappPhone: string;
  tours: Tour[];
  faqs: FaqDraft[];
  business: BusinessSection[];
  tone: "formal" | "friendly" | "casual";
  greeting: string;
}

const INITIAL_DATA: OnboardingData = {
  agencyName: "",
  country: "",
  whatsappConnected: false,
  whatsappPhone: "",
  tours: [{ id: "1", name: "", info: "", source: "manual" }],
  faqs: [{ id: "1", question: "", answer: "" }],
  business: [],
  tone: "friendly",
  greeting: "",
};

const STEP_COUNT = 5;

const COUNTRIES = [
  "Mexico",
  "Colombia",
  "Peru",
  "Argentina",
  "Chile",
  "Brazil",
  "Costa Rica",
  "Ecuador",
  "Guatemala",
  "Panama",
  "Dominican Republic",
  "Uruguay",
  "Bolivia",
  "Honduras",
  "Other",
];

/* ─── Main component ─── */
export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [orgCreated, setOrgCreated] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const update = useCallback(
    (patch: Partial<OnboardingData>) =>
      setData((prev) => ({ ...prev, ...patch })),
    [],
  );

  // Requisitos minimos por paso — sin esto el boton Continuar queda deshabilitado.
  // Personalidad (3) siempre es valida: tone tiene default y el saludo es opcional.
  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return data.agencyName.trim().length > 0 && data.country !== "";
      case 1:
        return data.whatsappConnected;
      case 2:
        return data.tours.some((tour) => tour.name.trim().length > 0);
      default:
        return true;
    }
  }, [step, data]);

  const ensureOrg = async (): Promise<boolean> => {
    if (orgCreated) return true;
    if (!data.agencyName.trim()) {
      toast.error("Agency name is required to continue");
      return false;
    }

    const baseSlug = data.agencyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const attempts = [baseSlug, `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`];
    for (const slug of attempts) {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_name: data.agencyName.trim(), slug }),
      });
      const result = await res.json();
      if (res.ok) {
        setOrgCreated(true);
        return true;
      }
      if (res.status !== 409) {
        toast.error(result.error ?? "Failed to create organization");
        return false;
      }
    }
    toast.error("Could not find an available slug. Try a different agency name.");
    return false;
  };

  const next = async () => {
    if (step >= STEP_COUNT - 1) return;

    // Leaving step 0 (Agency) → create the org so downstream steps have one
    if (step === 0 && !orgCreated) {
      setAdvancing(true);
      const ok = await ensureOrg();
      setAdvancing(false);
      if (!ok) return;
    }

    setDirection(1);
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const goToStep = (target: number) => {
    if (target < step) {
      setDirection(-1);
      setStep(target);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError(null);

    try {
      if (!orgCreated) {
        const ok = await ensureOrg();
        if (!ok) {
          setLaunching(false);
          return;
        }
      }

      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: data.tone,
          greeting: data.greeting.trim() || undefined,
          tours: data.tours
            .filter((tour) => tour.name.trim())
            .map((tour) => ({
              ...tour,
              name: tour.name.trim(),
              info: tour.info.trim(),
            })),
          faqs: data.faqs
            .filter((faq) => faq.question.trim() && faq.answer.trim())
            .map((faq) => ({
              question: faq.question.trim(),
              answer: faq.answer.trim(),
            })),
          business_info: data.business
            .filter((section) => section.title.trim() && section.content.trim())
            .map((section) => ({
              ...section,
              title: section.title.trim(),
              content: section.content.trim(),
            })),
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to finalize onboarding");
      }

      router.push("/conversations");
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Something went wrong");
      setLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ─── Top bar ─── */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-5 sm:px-6 h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 transition-transform group-hover:scale-105">
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
            <span className="font-display text-base font-bold tracking-tight text-navy-900">
              Tourfy
            </span>
          </Link>

          <span className="text-xs text-slate-400">
            {t("progress", { current: step + 1, total: STEP_COUNT })}
          </span>
        </div>
      </header>

      {/* ─── Progress stepper ─── */}
      <div className="border-b border-slate-100">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                disabled={i >= step}
                className={`flex items-center gap-1.5 sm:gap-2 group transition-all ${
                  i <= step ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Dot / check */}
                <div
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    i < step
                      ? "bg-navy-900 text-white"
                      : i === step
                        ? "bg-navy-900 text-white ring-4 ring-navy-900/10"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i < step ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`hidden sm:block text-xs font-medium transition-colors ${
                    i <= step ? "text-navy-900" : "text-slate-400"
                  }`}
                >
                  {t(`stepNames.${i}`)}
                </span>

                {/* Connector line */}
                {i < STEP_COUNT - 1 && (
                  <div className="w-4 sm:w-8 lg:w-12 h-0.5 rounded-full overflow-hidden bg-slate-100 mx-0.5 sm:mx-1">
                    <motion.div
                      className="h-full bg-navy-900 rounded-full origin-left"
                      initial={false}
                      animate={{ scaleX: i < step ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Step content ─── */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 mx-auto w-full max-w-3xl px-5 sm:px-6 py-8 sm:py-12">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && <StepAgency data={data} update={update} />}
              {step === 1 && <StepWhatsApp data={data} update={update} />}
              {step === 2 && <StepTours data={data} update={update} />}
              {step === 3 && <StepPersonality data={data} update={update} />}
              {step === 4 && <StepGoLive data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ─── Footer buttons ─── */}
        <div className="border-t border-slate-100">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 py-4 flex items-center justify-between">
            <button
              onClick={back}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-medium transition-all ${
                step === 0
                  ? "text-slate-300 cursor-default"
                  : "text-slate-600 hover:text-navy-900 hover:bg-slate-50 active:scale-[0.98]"
              }`}
              disabled={step === 0}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              {t("back")}
            </button>

            {step < STEP_COUNT - 1 ? (
              <div className="flex items-center gap-3">
                {!stepValid && (
                  <p className="text-xs text-slate-500 max-w-[220px] text-right">
                    {t(`validation.${step}`)}
                  </p>
                )}
              <button
                onClick={next}
                disabled={advancing || !stepValid}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {advancing ? t("saving") : t("next")}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {launchError && (
                  <p className="text-sm text-red-600">{launchError}</p>
                )}
                <button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {launching ? t("launching") : t("finish")}
                  {!launching && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STEP 1 — Agency info
   ═══════════════════════════════════════════════════ */
function StepAgency({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const t = useTranslations("onboarding.steps.agency");
  return (
    <div>
      <StepHeader
        number={t("number")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-8 space-y-5">
        <Field label={t("name")} htmlFor="agencyName">
          <input
            id="agencyName"
            type="text"
            value={data.agencyName}
            onChange={(e) => update({ agencyName: e.target.value })}
            placeholder={t("namePlaceholder")}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label={t("country")} htmlFor="country">
          <div className="relative">
            <select
              id="country"
              value={data.country}
              onChange={(e) => update({ country: e.target.value })}
              className={`${INPUT_CLASS} appearance-none cursor-pointer ${
                !data.country ? "text-slate-400" : ""
              }`}
            >
              <option value="" disabled>
                {t("countryPlaceholder")}
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </Field>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STEP 2 — Connect WhatsApp
   ═══════════════════════════════════════════════════ */
function StepWhatsApp({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const t = useTranslations("onboarding.steps.whatsapp");

  return (
    <div>
      <StepHeader
        number={t("number")}
        title={t("title")}
        description={t("description")}
      />

      {/* Main connect area */}
      <div className="mt-8">
        {!data.whatsappConnected ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-10 text-center">
            {/* WhatsApp icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green-500">
                <path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                  fill="currentColor"
                />
                <path
                  d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-green-500"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-navy-900 mb-2">
              {t("connectTitle")}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
              {t("connectDesc")}
            </p>

            <div className="flex justify-center">
              <ConnectWhatsAppButton
                onConnected={(account) =>
                  update({ whatsappConnected: true, whatsappPhone: account.phone_number })
                }
              />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-8 sm:p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 mb-5"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            <h3 className="text-lg font-bold text-green-900 mb-1">
              {t("connectedTitle")}
            </h3>
            <p className="text-sm text-green-700/70 mb-4">
              {t.rich("connectedSub", {
                phone: () => (
                  <span className="font-semibold text-green-800">{data.whatsappPhone}</span>
                ),
              })}
            </p>

            <button
              onClick={() => update({ whatsappConnected: false, whatsappPhone: "" })}
              className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors underline underline-offset-2"
            >
              {t("disconnect")}
            </button>
          </motion.div>
        )}
      </div>

      {/* How it works card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">
          {t("howItWorks")}
        </p>
        <div className="space-y-4">
          {[
            { step: "1", titleKey: "step1Title", descKey: "step1Desc" },
            { step: "2", titleKey: "step2Title", descKey: "step2Desc" },
            { step: "3", titleKey: "step3Title", descKey: "step3Desc" },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-xs font-bold text-navy-700">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {t(item.titleKey)}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed mt-0.5">
                  {t(item.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {t("trustEncrypted")}
        </span>
        <span className="h-3 w-px bg-slate-200" />
        <span>{t("trustPartner")}</span>
        <span className="h-3 w-px bg-slate-200" />
        <span>{t("trustNoFees")}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STEP 3 — Tours & FAQs
   ═══════════════════════════════════════════════════ */
function StepTours({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const t = useTranslations("onboarding.steps.tours");
  const hasContent =
    data.tours.some((tour) => tour.name.trim()) ||
    data.faqs.some((faq) => faq.question.trim()) ||
    data.business.some((section) => section.title.trim());
  const [mode, setMode] = useState<"picker" | "edit">(hasContent ? "edit" : "picker");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const MAX_UPLOAD_FILES = 8;
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  const applyDraft = (result: ImportResult) => {
    update({
      tours: [...data.tours.filter((tour) => tour.name.trim()), ...result.tours],
      faqs: [
        ...data.faqs.filter((faq) => faq.question.trim()),
        ...result.faqs.map((faq) => ({ id: crypto.randomUUID(), ...faq })),
      ],
      business: [...data.business.filter((section) => section.title.trim()), ...result.business],
    });
    setMode("edit");
  };

  const runImport = async () => {
    if (!url.trim()) return;
    setImporting(true);
    try {
      const result = await importFromUrl(url);
      const total = result.tours.length + result.faqs.length + result.business.length;
      if (total === 0) {
        toast.message(result.thin ? t("importThin") : t("importEmpty"));
      } else {
        toast.success(
          t("importDone", {
            tours: result.tours.length,
            sections: result.business.length,
            faqs: result.faqs.length,
          }),
        );
        applyDraft(result);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("importError"));
    } finally {
      setImporting(false);
    }
  };

  const runFileImport = async (files: File[]) => {
    if (files.length === 0) return;

    // Validación ligera en el cliente (espejo del server) para feedback inmediato.
    if (files.length > MAX_UPLOAD_FILES) {
      toast.error(t("uploadTooLarge"));
      return;
    }
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
        toast.error(t("uploadTooLarge"));
        return;
      }
    }

    setUploading(true);
    try {
      const result = await importFromFiles(files);
      const total = result.tours.length + result.faqs.length + result.business.length;
      if (total === 0) {
        toast.message(t("uploadEmpty"));
      } else {
        toast.success(
          t("importDone", {
            tours: result.tours.length,
            sections: result.business.length,
            faqs: result.faqs.length,
          }),
        );
        applyDraft(result);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startManual = () => {
    if (data.tours.length === 0) {
      update({ tours: [{ id: crypto.randomUUID(), name: "", info: "", source: "manual" }] });
    }
    setMode("edit");
  };

  if (mode === "picker") {
    return (
      <div>
        <StepHeader number={t("number")} title={t("title")} description={t("description")} />

        <div className="mt-8 space-y-3">
          {/* Importar desde la web */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-navy-900">{t("sourceWebTitle")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("sourceWebDesc")}</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !importing && runImport()}
                placeholder={t("urlPlaceholder")}
                className={INPUT_CLASS}
              />
              <button
                onClick={runImport}
                disabled={importing || !url.trim()}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing && (
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {importing ? t("importing") : t("importCta")}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {importing ? t("importingHint") : t("importHint")}
            </p>
          </div>

          {/* Subir tarifario — PDF o fotos */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-navy-900">{t("sourcePdfTitle")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("sourcePdfDesc")}</p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => runFileImport(Array.from(e.target.files ?? []))}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-3 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-navy-900 bg-white px-5 text-sm font-bold text-navy-900 transition-all hover:bg-navy-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading && (
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {uploading ? t("uploading") : t("uploadCta")}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              {uploading ? t("uploadingHint") : t("uploadHint")}
            </p>
          </div>

          {/* Agregar manualmente */}
          <button
            onClick={startManual}
            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            <h3 className="text-sm font-bold text-navy-900">{t("sourceManual")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("sourceManualDesc")}</p>
          </button>

          <p className="pt-1 text-center text-xs text-slate-400">{t("editLaterHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader number={t("number")} title={t("title")} description={t("description")} />

      <button
        onClick={() => setMode("picker")}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-navy-900 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        {t("changeSource")}
      </button>

      <div className="mt-4">
        <TourCards
          tours={data.tours}
          faqs={data.faqs}
          business={data.business}
          onToursChange={(tours) => update({ tours })}
          onFaqsChange={(faqs) => update({ faqs })}
          onBusinessChange={(business) => update({ business })}
        />
      </div>

      {/* Tip */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{t("tip")}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STEP 4 — Bot personality
   ═══════════════════════════════════════════════════ */
function StepPersonality({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const t = useTranslations("onboarding.steps.personality");
  const tones = [
    { value: "formal" as const, labelKey: "formalLabel", descKey: "formalDesc", exampleKey: "formalExample" },
    { value: "friendly" as const, labelKey: "friendlyLabel", descKey: "friendlyDesc", exampleKey: "friendlyExample" },
    { value: "casual" as const, labelKey: "casualLabel", descKey: "casualDesc", exampleKey: "casualExample" },
  ];

  const agency = data.agencyName || t("greetingFallback");

  return (
    <div>
      <StepHeader
        number={t("number")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-8 space-y-3">
        {tones.map((tone) => (
          <button
            key={tone.value}
            type="button"
            onClick={() => update({ tone: tone.value })}
            className={`w-full text-left rounded-2xl border p-5 transition-all ${
              data.tone === tone.value
                ? "border-navy-900 bg-navy-900/[0.02] ring-2 ring-navy-900/10"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  data.tone === tone.value
                    ? "border-navy-900 bg-navy-900"
                    : "border-slate-300"
                }`}
              >
                {data.tone === tone.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-white"
                  />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-navy-900">
                  {t(tone.labelKey)}
                </span>
                <span className="text-sm text-slate-500 ml-2">
                  {t(tone.descKey)}
                </span>
              </div>
            </div>

            {/* Example message preview */}
            <div className="ml-8 rounded-xl bg-slate-50 border border-slate-100 p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-4 w-4 rounded-full bg-navy-900/10 flex items-center justify-center">
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-navy-700"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-navy-700">
                  {t("botLabel")}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(tone.exampleKey)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Custom greeting */}
      <div className="mt-8">
        <Field
          label={t("greetingLabel")}
          htmlFor="greeting"
          hint={t("greetingHint")}
        >
          <textarea
            id="greeting"
            value={data.greeting}
            onChange={(e) => update({ greeting: e.target.value })}
            placeholder={t("greetingPlaceholder", { agency })}
            rows={3}
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STEP 5 — Go Live / Preview
   ═══════════════════════════════════════════════════ */
function StepGoLive({ data }: { data: OnboardingData }) {
  const t = useTranslations("onboarding.steps.preview");
  const agency = data.agencyName || t("agencyFallback");
  type PreviewMessage = { from: "bot" | "user"; text: string };
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([
    {
      from: "bot",
      text: data.greeting || t("greetingFallback", { agency }),
    },
  ]);
  const [input, setInput] = useState("");

  const sendPreview = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setPreviewMessages((prev) => [...prev, { from: "user" as const, text: userMsg }]);

    setTimeout(() => {
      const tourName = data.tours[0]?.name || t("sampleTourName");
      const tourInfo = data.tours[0]?.info || t("sampleTourPrice");
      const responseKey =
        data.tone === "formal" ? "responseFormal"
        : data.tone === "casual" ? "responseCasual"
        : "responseFriendly";
      const response = t(responseKey, { name: tourName, price: tourInfo });
      setPreviewMessages((prev) => [...prev, { from: "bot" as const, text: response }]);
    }, 1200);
  };

  const toneLabelKey =
    data.tone === "formal" ? "formalLabel" : data.tone === "casual" ? "casualLabel" : "friendlyLabel";
  const tPersonality = useTranslations("onboarding.steps.personality");

  return (
    <div>
      <StepHeader
        number={t("number")}
        title={t("title")}
        description={t("description")}
      />

      {/* Summary cards */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: t("summaryAgency"), value: data.agencyName || "—" },
          { label: t("summaryTours"), value: `${data.tours.filter((tour) => tour.name).length}` },
          { label: t("summaryTone"), value: tPersonality(toneLabelKey) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy-900 truncate">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* WhatsApp preview */}
      <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden">
        {/* Phone header */}
        <div className="bg-navy-900 px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
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
          <div>
            <p className="text-sm font-semibold text-white">
              {data.agencyName || t("previewYourAgency")}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-white/60">{t("botActive")}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-slate-50 p-4 space-y-2.5 min-h-[260px] max-h-[320px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {previewMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2 max-w-[80%] text-sm leading-relaxed ${
                    msg.from === "user"
                      ? "bg-blue-500 text-white rounded-tr-md"
                      : "bg-white border border-slate-200 text-navy-900 rounded-tl-md shadow-sm"
                  }`}
                >
                  {msg.from === "bot" && (
                    <span className="block text-[10px] font-semibold text-blue-500 mb-0.5">
                      {t("botLabel")}
                    </span>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendPreview()}
            placeholder={t("inputPlaceholder")}
            className="flex-1 h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <button
            onClick={sendPreview}
            className="h-9 w-9 rounded-lg bg-navy-900 flex items-center justify-center text-white hover:bg-navy-800 transition-colors active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Ready callout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 rounded-xl border border-green-200 bg-green-50/50 p-4 flex gap-3"
      >
        <div className="shrink-0 mt-0.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-900">
            {t("readyTitle")}
          </p>
          <p className="text-sm text-green-700/70 mt-0.5">
            {t("readyDesc")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Shared components
   ═══════════════════════════════════════════════════ */

const INPUT_CLASS =
  "w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function StepHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <span className="inline-flex h-6 items-center rounded-full bg-navy-900/5 px-2.5 text-[10px] font-bold text-navy-700 tracking-widest uppercase">
        {t("stepLabel")} {number}
      </span>
      <h2 className="mt-3 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-navy-950">
        {title}
      </h2>
      <p className="mt-1.5 text-sm sm:text-base text-slate-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-navy-900 mb-1.5"
      >
        {label}
      </label>
      {hint && (
        <p className="text-xs text-slate-400 mb-1.5">{hint}</p>
      )}
      {children}
    </div>
  );
}
