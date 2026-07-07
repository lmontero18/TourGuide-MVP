"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { FadeUp } from "./Motion";
import { Bubble, CheckIcon, Reveal } from "./PreviewBits";

// Cada tab reproduce su animacion (~4s) y luego respira antes de rotar.
const AUTO_ADVANCE_MS = 9000;

export function HowItWorks() {
  const t = useTranslations("how");
  const [active, setActive] = useState(0);

  // Auto-rotacion de tabs; se reinicia cuando el usuario elige uno.
  useEffect(() => {
    const id = setInterval(
      () => setActive((a) => (a + 1) % 3),
      AUTO_ADVANCE_MS
    );
    return () => clearInterval(id);
  }, [active]);

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24 lg:py-32 bg-slate-50 relative overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
              {t("label")}
            </p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-navy-950">
              {t("title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-500 leading-relaxed">
              {t("sub")}
            </p>
          </div>
        </FadeUp>

        {/* Tabs — un tab por paso, estilo editorial */}
        <FadeUp delay={0.15}>
          <div className="mt-10 sm:mt-14 flex justify-center">
            <div className="flex w-full max-w-3xl overflow-x-auto sm:overflow-visible">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative flex-1 min-w-[140px] px-3 sm:px-4 pb-3 pt-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-t-lg ${
                    active === i
                      ? "text-navy-950"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="block text-[10px] font-bold tracking-wider uppercase mb-1">
                    {t(`steps.${i}.step`)}
                  </span>
                  <span className="block font-display text-sm sm:text-base font-bold tracking-tight">
                    {t(`steps.${i}.title`)}
                  </span>
                  {/* Linea base */}
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-slate-200" aria-hidden />
                  {active === i && (
                    <motion.span
                      layoutId="how-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy-900"
                      aria-hidden
                    >
                      {/* Barra de progreso hasta el siguiente tab */}
                      <motion.span
                        className="absolute inset-y-0 left-0 bg-blue-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                      />
                    </motion.span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Descripcion del paso activo */}
          <div className="mt-5 text-center min-h-[48px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={active}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed"
              >
                {t(`steps.${active}.desc`)}
              </motion.p>
            </AnimatePresence>
          </div>
        </FadeUp>

        {/* Preview con la UI real */}
        <FadeUp delay={0.25}>
          <div className="mt-8 sm:mt-10 max-w-4xl mx-auto">
            <div className="browser-frame overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="browser-dots flex gap-1.5">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="flex-1 mx-2 sm:mx-3">
                  <div className="mx-auto max-w-md h-5 sm:h-6 rounded-md bg-slate-100 flex items-center justify-center px-3">
                    <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium tracking-wide truncate">
                      {["app.tourfy.com/onboarding", "app.tourfy.com/onboarding", "app.tourfy.com/conversations"][active]}
                    </span>
                  </div>
                </div>
                <div className="w-8 sm:w-[52px]" />
              </div>

              {/* Contenido del tab — remonta en cada cambio y la secuencia se reproduce de nuevo */}
              <div className="relative bg-white pointer-events-none select-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {active === 0 && <ImportPreview />}
                    {active === 1 && <ConnectPreview />}
                    {active === 2 && <LeadsPreview />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Bottom reassurance */}
        <FadeUp delay={0.3}>
          <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-navy-700" />
                <span className="text-sm text-slate-500">{t(`checks.${i}`)}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ─── Paso 1: importar tours (espejo del onboarding real) ─── */

function ImportPreview() {
  const t = useTranslations("onboarding.steps.tours");
  const tours = [
    { name: "Machu Picchu Full Day", price: "$320 USD" },
    { name: "Valle Sagrado + Almuerzo", price: "$180 USD" },
    { name: "Laguna Humantay", price: "$95 USD" },
  ];

  return (
    <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-start">
      {/* Fuente: URL */}
      <Reveal at={0.1} className="rounded-xl border border-slate-200 p-4 sm:p-5">
        <p className="text-sm font-bold text-navy-950">{t("sourceWebTitle")}</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t("sourceWebDesc")}</p>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 flex items-center overflow-hidden">
            {/* URL "tipeandose" */}
            <motion.span
              className="text-xs text-slate-600 whitespace-nowrap overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ delay: 0.5, duration: 0.9, ease: "linear" }}
            >
              https://cuscoexpeditions.com
            </motion.span>
          </div>
          <motion.div
            className="h-9 rounded-lg bg-navy-900 px-4 flex items-center"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.5, 1, 0.8, 1] }}
            transition={{ delay: 1.4, duration: 0.5, times: [0, 0.4, 0.6, 0.8, 1] }}
          >
            <span className="text-xs font-bold text-white">{t("importCta")}</span>
          </motion.div>
        </div>
        <Reveal at={1.9} className="mt-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[11px] text-slate-500">{t("importing")}</span>
        </Reveal>
      </Reveal>

      {/* Resultado: tours extraidos */}
      <Reveal at={2.6} className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-green-600" />
          <p className="text-xs font-semibold text-slate-600">
            {t("importDone", { tours: 3, sections: 2, faqs: 5 })}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {tours.map((tour, i) => (
            <Reveal
              key={tour.name}
              at={2.9 + i * 0.3}
              pop
              className="flex items-center justify-between rounded-lg bg-white border border-slate-200/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckIcon className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-xs font-semibold text-navy-950 truncate">{tour.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">{tour.price}</span>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

/* ─── Paso 2: conectar WhatsApp (espejo del Embedded Signup) ─── */

function ConnectPreview() {
  const t = useTranslations("onboarding.steps.whatsapp");

  return (
    <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-center">
      {/* Pasos del proceso — se completan en secuencia */}
      <div className="space-y-3 order-2 md:order-1">
        {[
          [t("step1Title"), t("step1Desc")],
          [t("step2Title"), t("step2Desc")],
          [t("step3Title"), t("step3Desc")],
        ].map(([title, desc], i) => (
          <Reveal key={i} at={0.3 + i * 0.7} className="flex gap-3">
            <div className="relative h-6 w-6 shrink-0">
              <div className="absolute inset-0 rounded-full bg-navy-900/5 border border-slate-200 flex items-center justify-center">
                <span className="text-[10px] font-bold text-navy-900">{i + 1}</span>
              </div>
              {/* Check verde que "completa" el paso */}
              <motion.div
                className="absolute inset-0 rounded-full bg-green-100 border border-green-300 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.7, duration: 0.25 }}
              >
                <CheckIcon className="h-3 w-3 text-green-600" />
              </motion.div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-navy-950">{title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed line-clamp-2">{desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Card de conexion exitosa — aparece al final */}
      <Reveal at={2.9} pop className="rounded-xl border border-green-200 bg-green-50/40 p-5 sm:p-6 text-center order-1 md:order-2">
        <motion.div
          className="mx-auto h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center"
          initial={{ scale: 0.5 }}
          animate={{ scale: [0.5, 1.15, 1] }}
          transition={{ delay: 3.1, duration: 0.4, times: [0, 0.7, 1] }}
        >
          <CheckIcon className="h-6 w-6 text-green-600" />
        </motion.div>
        <p className="mt-3 font-display text-base font-bold text-navy-950">
          {t("connectedTitle")}
        </p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          {t("connectedSub", { phone: "+51 984 123 456" })}
        </p>
        <div className="mt-4 inline-flex h-9 items-center rounded-lg bg-[#1877F2] px-4 opacity-90">
          <span className="text-xs font-bold text-white">{t("connectCta")}</span>
        </div>
      </Reveal>
    </div>
  );
}

/* ─── Paso 3: leads calificados (espejo del dashboard) ─── */

function LeadsPreview() {
  const tDemo = useTranslations("features.demo");
  const tChat = useTranslations("dashboard.chat");
  const tHow = useTranslations("how.preview");

  return (
    <div className="grid grid-cols-1 md:grid-cols-5">
      {/* Chat */}
      <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-200/60">
        {/* Header del chat */}
        <div className="h-11 border-b border-slate-200/60 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-600">MG</span>
            </div>
            <div>
              <p className="text-xs font-bold text-navy-950">María González</p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-slate-500">WhatsApp</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-green-50 border border-green-200/60 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-semibold text-green-700">Bot</span>
          </div>
        </div>
        {/* Conversacion que se reproduce en vivo */}
        <div className="p-3 sm:p-4 space-y-2.5 bg-slate-50/50 min-h-[210px]">
          <Reveal at={0.3} pop>
            <Bubble side="left" text={tDemo("msg0")} />
          </Reveal>
          {/* Typing del bot: aparece y desaparece antes de su respuesta */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], height: ["0px", "auto", "auto", "0px"] }}
            transition={{ delay: 0.8, duration: 1.1, times: [0, 0.15, 0.85, 1] }}
          >
            <div className="bg-blue-500/10 border border-blue-200/40 rounded-xl rounded-tr-sm px-2.5 py-2 flex items-center gap-1">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="block h-1.5 w-1.5 rounded-full bg-blue-400/60"
                  style={{ animation: `pulse-dot 1.4s ${d * 0.2}s infinite` }}
                />
              ))}
            </div>
          </motion.div>
          <Reveal at={1.9} pop>
            <Bubble side="right" text={tDemo("msg1")} />
          </Reveal>
          <Reveal at={2.9} pop>
            <Bubble side="left" text={tDemo("msg2")} />
          </Reveal>
        </div>
      </div>

      {/* Panel de lead calificado — se llena campo por campo */}
      <div className="md:col-span-2 p-4 sm:p-5">
        <Reveal at={3.3} className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {tHow("leadTitle")}
          </p>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
            {tHow("leadStatus")}
          </span>
        </Reveal>
        <div className="mt-3 space-y-2.5">
          {[
            [tHow("leadInterest"), "Machu Picchu Full Day"],
            [tHow("leadDates"), tHow("leadDatesV")],
            [tHow("leadGroup"), tHow("leadGroupV")],
            [tHow("leadBudget"), "$1,280 USD"],
          ].map(([label, value], i) => (
            <Reveal
              key={label}
              at={3.5 + i * 0.25}
              pop
              className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/60 px-3 py-2"
            >
              <span className="text-[11px] text-slate-500">{label}</span>
              <span className="text-[11px] font-bold text-navy-950">{value}</span>
            </Reveal>
          ))}
        </div>
        <Reveal at={4.6} className="mt-4">
          <div className="h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
            <span className="text-xs font-semibold text-navy-900">{tChat("takeControl")}</span>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
