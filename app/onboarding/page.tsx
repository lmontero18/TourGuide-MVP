"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─── */
interface OnboardingData {
  agencyName: string;
  country: string;
  language: string;
  whatsappNumber: string;
  verificationCode: string;
  tours: Tour[];
  faqs: FAQ[];
  tone: "formal" | "friendly" | "casual";
  greeting: string;
}

interface Tour {
  id: string;
  name: string;
  price: string;
  description: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const INITIAL_DATA: OnboardingData = {
  agencyName: "",
  country: "",
  language: "es",
  whatsappNumber: "",
  verificationCode: "",
  tours: [{ id: "1", name: "", price: "", description: "" }],
  faqs: [{ id: "1", question: "", answer: "" }],
  tone: "friendly",
  greeting: "",
};

const STEPS = [
  { label: "Agency", icon: "building" },
  { label: "WhatsApp", icon: "phone" },
  { label: "Tours", icon: "map" },
  { label: "Personality", icon: "sparkle" },
  { label: "Go live", icon: "rocket" },
];

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
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  const update = useCallback(
    (patch: Partial<OnboardingData>) =>
      setData((prev) => ({ ...prev, ...patch })),
    [],
  );

  const next = () => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
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
              TourGuide
            </span>
          </Link>

          <span className="text-xs text-slate-400">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      {/* ─── Progress stepper ─── */}
      <div className="border-b border-slate-100">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.label}
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
                  {s.label}
                </span>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
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
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                Continue
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
            ) : (
              <Link
                href="/dashboard/conversations"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                Launch my bot
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
              </Link>
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
  return (
    <div>
      <StepHeader
        number="01"
        title="Tell us about your agency"
        description="This helps us customize your bot and dashboard for your region and language."
      />

      <div className="mt-8 space-y-5">
        <Field label="Agency name" htmlFor="agencyName">
          <input
            id="agencyName"
            type="text"
            value={data.agencyName}
            onChange={(e) => update({ agencyName: e.target.value })}
            placeholder="Cusco Expeditions"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Country" htmlFor="country">
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
                Select your country
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

        <Field label="Bot language" htmlFor="language">
          <div className="flex gap-2">
            {[
              { value: "es", label: "Español", flag: "🇪🇸" },
              { value: "en", label: "English", flag: "🇺🇸" },
              { value: "pt", label: "Português", flag: "🇧🇷" },
            ].map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => update({ language: lang.value })}
                className={`flex-1 h-11 rounded-xl border text-sm font-medium transition-all ${
                  data.language === lang.value
                    ? "border-navy-900 bg-navy-900/5 text-navy-900 ring-2 ring-navy-900/10"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="mr-1.5">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Tip card */}
      <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex gap-3">
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
        <p className="text-sm text-slate-600 leading-relaxed">
          Your bot will answer in this language by default. Clients can still
          write in any language — the bot will detect and respond accordingly.
        </p>
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
  return (
    <div>
      <StepHeader
        number="02"
        title="Connect your WhatsApp"
        description="We'll link your WhatsApp Business number so the bot can send and receive messages."
      />

      <div className="mt-8 space-y-5">
        <Field label="WhatsApp Business number" htmlFor="whatsapp">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="text-green-500"
              >
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
            <input
              id="whatsapp"
              type="tel"
              value={data.whatsappNumber}
              onChange={(e) => update({ whatsappNumber: e.target.value })}
              placeholder="+52 55 1234 5678"
              className={`${INPUT_CLASS} pl-10`}
            />
          </div>
        </Field>
      </div>

      {/* How it works card */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">
          How it works
        </p>
        <div className="space-y-4">
          {[
            {
              icon: "link",
              title: "We connect via Twilio",
              desc: "Your existing WhatsApp Business number gets linked through Twilio's API — no new number needed.",
            },
            {
              icon: "shield",
              title: "Fully encrypted",
              desc: "All messages are end-to-end encrypted. We never store message content beyond what you see in your dashboard.",
            },
            {
              icon: "zap",
              title: "Takes 2 minutes",
              desc: "We'll send a verification code to confirm ownership, then you're connected.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                <StepIcon name={item.icon} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {item.title}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skip option */}
      <p className="mt-4 text-center text-xs text-slate-400">
        Don&apos;t have a WhatsApp Business number?{" "}
        <button className="font-medium text-blue-500 hover:text-blue-600 transition-colors">
          We&apos;ll help you set one up
        </button>
      </p>
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
  const addTour = () => {
    update({
      tours: [
        ...data.tours,
        { id: crypto.randomUUID(), name: "", price: "", description: "" },
      ],
    });
  };

  const removeTour = (id: string) => {
    if (data.tours.length <= 1) return;
    update({ tours: data.tours.filter((t) => t.id !== id) });
  };

  const updateTour = (id: string, patch: Partial<Tour>) => {
    update({
      tours: data.tours.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  const addFaq = () => {
    update({
      faqs: [
        ...data.faqs,
        { id: crypto.randomUUID(), question: "", answer: "" },
      ],
    });
  };

  const removeFaq = (id: string) => {
    if (data.faqs.length <= 1) return;
    update({ faqs: data.faqs.filter((f) => f.id !== id) });
  };

  const updateFaq = (id: string, patch: Partial<FAQ>) => {
    update({
      faqs: data.faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  return (
    <div>
      <StepHeader
        number="03"
        title="Add your tours & FAQs"
        description="This is what your bot will use to answer questions. You can always edit this later."
      />

      {/* Tours */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-navy-900">Tours</h3>
          <button
            onClick={addTour}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add tour
          </button>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {data.tours.map((tour, i) => (
              <motion.div
                key={tour.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Tour {i + 1}
                    </span>
                    {data.tours.length > 1 && (
                      <button
                        onClick={() => removeTour(tour.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                    <input
                      type="text"
                      value={tour.name}
                      onChange={(e) =>
                        updateTour(tour.id, { name: e.target.value })
                      }
                      placeholder="Tour name (e.g. Machu Picchu Full Day)"
                      className={INPUT_CLASS_SM}
                    />
                    <input
                      type="text"
                      value={tour.price}
                      onChange={(e) =>
                        updateTour(tour.id, { price: e.target.value })
                      }
                      placeholder="$320 USD"
                      className={INPUT_CLASS_SM}
                    />
                  </div>
                  <textarea
                    value={tour.description}
                    onChange={(e) =>
                      updateTour(tour.id, { description: e.target.value })
                    }
                    placeholder="Brief description — what's included, duration, highlights..."
                    rows={2}
                    className={`${INPUT_CLASS_SM} resize-none`}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div className="my-8 h-px bg-slate-200" />

      {/* FAQs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-navy-900">
            Frequently asked questions
          </h3>
          <button
            onClick={addFaq}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add FAQ
          </button>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {data.faqs.map((faq, i) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      FAQ {i + 1}
                    </span>
                    {data.faqs.length > 1 && (
                      <button
                        onClick={() => removeFaq(faq.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) =>
                      updateFaq(faq.id, { question: e.target.value })
                    }
                    placeholder="Question clients ask (e.g. Do you offer hotel pickup?)"
                    className={INPUT_CLASS_SM}
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) =>
                      updateFaq(faq.id, { answer: e.target.value })
                    }
                    placeholder="Your answer..."
                    rows={2}
                    className={`${INPUT_CLASS_SM} resize-none`}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
        <p className="text-sm text-slate-600 leading-relaxed">
          Don&apos;t worry about getting it perfect — you can edit tours and FAQs
          anytime from your dashboard.
        </p>
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
  const tones = [
    {
      value: "formal" as const,
      label: "Professional",
      desc: "Polished and courteous. Perfect for luxury travel.",
      example:
        "Good afternoon! Thank you for your interest in our Sacred Valley tour. The price per person is $320 USD, which includes transport, a bilingual guide, and lunch. Shall I check availability for your preferred date?",
    },
    {
      value: "friendly" as const,
      label: "Friendly",
      desc: "Warm and approachable. Great for most agencies.",
      example:
        "Hey! 👋 Great choice — the Sacred Valley tour is one of our favorites! It's $320 per person and includes everything: transport, guide, and lunch. When were you thinking of going?",
    },
    {
      value: "casual" as const,
      label: "Casual",
      desc: "Relaxed and fun. Ideal for adventure / backpacker tours.",
      example:
        "Yo! 🏔️ Sacred Valley is amazing, you're gonna love it! $320 per person, all-inclusive. Just tell me your dates and group size and I'll lock it in for you!",
    },
  ];

  return (
    <div>
      <StepHeader
        number="04"
        title="Set your bot's personality"
        description="Choose how your bot talks to customers. This sets the tone for every conversation."
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
                  {tone.label}
                </span>
                <span className="text-sm text-slate-500 ml-2">
                  {tone.desc}
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
                  TourGuide Bot
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {tone.example}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Custom greeting */}
      <div className="mt-8">
        <Field
          label="Custom greeting (optional)"
          htmlFor="greeting"
          hint="First message when someone contacts you on WhatsApp"
        >
          <textarea
            id="greeting"
            value={data.greeting}
            onChange={(e) => update({ greeting: e.target.value })}
            placeholder={`¡Hola! 👋 Soy el asistente de ${data.agencyName || "tu agencia"}. ¿En qué te puedo ayudar?`}
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
  const [previewMessages, setPreviewMessages] = useState([
    {
      from: "bot" as const,
      text:
        data.greeting ||
        `¡Hola! 👋 Soy el asistente de ${data.agencyName || "tu agencia"}. ¿En qué te puedo ayudar?`,
    },
  ]);
  const [input, setInput] = useState("");

  const sendPreview = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setPreviewMessages((prev) => [...prev, { from: "user" as const, text: userMsg }]);

    // Simulate bot response
    setTimeout(() => {
      const tourName = data.tours[0]?.name || "Machu Picchu Full Day";
      const tourPrice = data.tours[0]?.price || "$320 USD";
      let response = "";

      if (data.tone === "formal") {
        response = `Thank you for your interest! Our ${tourName} tour is priced at ${tourPrice} per person. Would you like me to check availability for a specific date?`;
      } else if (data.tone === "casual") {
        response = `Nice! 🏔️ The ${tourName} is ${tourPrice} per person — it's awesome! What dates work for you?`;
      } else {
        response = `Great question! 😊 The ${tourName} is ${tourPrice} per person and includes everything. Want me to check dates for you?`;
      }

      setPreviewMessages((prev) => [...prev, { from: "bot" as const, text: response }]);
    }, 1200);
  };

  return (
    <div>
      <StepHeader
        number="05"
        title="Preview & go live"
        description="Test your bot below, then launch it when you're ready."
      />

      {/* Summary cards */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Agency", value: data.agencyName || "—" },
          { label: "Language", value: data.language === "es" ? "Español" : data.language === "pt" ? "Português" : "English" },
          { label: "Tours", value: `${data.tours.filter((t) => t.name).length}` },
          { label: "Tone", value: data.tone === "formal" ? "Professional" : data.tone === "casual" ? "Casual" : "Friendly" },
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
              {data.agencyName || "Your Agency"}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-white/60">Bot active</span>
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
                      TourGuide Bot
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
            placeholder="Type a message to test your bot..."
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
            Your bot is ready to go live
          </p>
          <p className="text-sm text-green-700/70 mt-0.5">
            Click &ldquo;Launch my bot&rdquo; to activate it on your WhatsApp
            number. You can pause it anytime from the dashboard.
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

const INPUT_CLASS_SM =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function StepHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <span className="inline-flex h-6 items-center rounded-full bg-navy-900/5 px-2.5 text-[10px] font-bold text-navy-700 tracking-widest uppercase">
        Step {number}
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

function StepIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  };

  return (
    <div
      className="h-4 w-4 text-navy-700"
      dangerouslySetInnerHTML={{ __html: icons[name] || "" }}
    />
  );
}
