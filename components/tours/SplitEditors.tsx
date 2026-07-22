"use client";

/**
 * Editores master–detail para el dashboard de Tours & FAQs.
 * En vez de apilar tarjetas hacia abajo, cada sección es un panel con
 * una lista a la izquierda y el editor del ítem seleccionado a la derecha
 * (mismo patrón que las conversaciones). El texto largo cabe sin amontonarse.
 *
 * El onboarding sigue usando los editores apilados de `TourCards.tsx`.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { FaqDraft } from "./TourCards";
import type { BusinessSection, PriceTier, Tour } from "@/types";

const CURRENCIES = ["USD", "CRC", "PEN", "MXN", "COP", "ARS", "CLP", "BRL", "GTQ", "BOB", "UYU", "DOP", "PAB", "EUR"];

const INPUT_BASE =
  "h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const INPUT = `w-full ${INPUT_BASE}`;
const TEXTAREA = `${INPUT} h-auto py-3 leading-relaxed resize-none`;
const FIELD_LABEL = "block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5";

const PlusIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

function ReviewBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      {label}
    </span>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-navy-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 cursor-pointer"
    >
      <PlusIcon /> {label}
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 cursor-pointer"
      aria-label="remove"
    >
      <TrashIcon />
    </button>
  );
}

/** Modal de confirmación propio (no window.confirm) para acciones destructivas. */
function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Al abrir: guarda qué elemento tenía el foco (para devolvérselo al cerrar)
  // y mueve el foco a "Cancelar" — la acción segura por defecto en un diálogo
  // destructivo. Tab/Shift+Tab quedan atrapados dentro del diálogo mientras
  // está abierto; Escape cierra igual que clickear afuera.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const container = dialogRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-navy-900/40 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-navy-900">
              {title}
            </h3>
            <p id="confirm-dialog-message" className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="inline-flex h-9 items-center rounded-xl bg-red-500 px-4 text-xs font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 cursor-pointer"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Contenedor de dos paneles con alto fijo en desktop (scroll interno). */
function Workspace({ rail, detail }: { rail: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[clamp(440px,calc(100vh-22rem),680px)] lg:flex-row">
      {rail}
      {detail}
    </div>
  );
}

interface RailItem {
  id: string;
  title: string;
  meta: string;
  flag?: boolean;
  missing?: boolean;
}

function Rail({
  ns,
  heading,
  items,
  selectedId,
  onSelect,
  addLabel,
  onAdd,
  missingLabel,
}: {
  ns: string;
  heading: string;
  items: RailItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  addLabel: string;
  onAdd: () => void;
  missingLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-col border-b border-slate-100 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {heading} · {items.length}
        </span>
        <AddButton label={addLabel} onClick={onAdd} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto p-2 lg:flex-col lg:gap-0.5 lg:overflow-x-visible lg:overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.map((it) => {
            const active = it.id === selectedId;
            return (
              <motion.button
                key={it.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelect(it.id)}
                aria-current={active ? "true" : undefined}
                className={`relative w-48 shrink-0 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 lg:w-full lg:shrink ${
                  active ? "bg-blue-50/70" : "hover:bg-slate-50"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={`rail-sel-${ns}`}
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-500"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <p className={`flex-1 truncate text-sm font-semibold ${active ? "text-blue-700" : "text-navy-900"}`}>
                    {it.title || "—"}
                  </p>
                  {it.missing && (
                    <span
                      title={missingLabel}
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-100 text-[10px] font-bold leading-none text-red-600"
                    >
                      !<span className="sr-only">{missingLabel}</span>
                    </span>
                  )}
                  {it.flag && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">{it.meta || "·"}</p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyDetail({ text, addLabel, onAdd }: { text: string; addLabel: string; onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        <PlusIcon className="h-5 w-5" />
      </div>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">{text}</p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-navy-900 transition-colors hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer"
      >
        <PlusIcon /> {addLabel}
      </button>
    </div>
  );
}

function DetailPane({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="p-5 lg:p-6"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Selección derivada en render: si el id guardado ya no existe (o no hay), cae
 * al último de la lista. Evita el setState-en-effect y los renders en cascada.
 */
function useSelection(ids: string[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveId = selectedId && ids.includes(selectedId) ? selectedId : (ids[ids.length - 1] ?? null);
  return [effectiveId, setSelectedId] as const;
}

/* ─────────────── Tours ─────────────── */
export function ToursSplit({ tours, onChange }: { tours: Tour[]; onChange: (v: Tour[]) => void }) {
  const t = useTranslations("onboarding.steps.tours");
  const [selectedId, setSelectedId] = useSelection(tours.map((x) => x.id));
  const selected = tours.find((x) => x.id === selectedId) ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const add = () => {
    const id = crypto.randomUUID();
    onChange([...tours, { id, name: "", prices: [], info: "", source: "manual" }]);
    setSelectedId(id);
  };
  const remove = (id: string) => onChange(tours.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<Tour>) =>
    onChange(tours.map((x) => (x.id === id ? { ...x, ...p, confidence: undefined } : x)));

  const setPrices = (tour: Tour, prices: PriceTier[]) => patch(tour.id, { prices });
  const addPrice = (tour: Tour) => setPrices(tour, [...(tour.prices ?? []), { amount: 0, currency: "USD" }]);
  const updatePrice = (tour: Tour, idx: number, p: Partial<PriceTier>) =>
    setPrices(tour, (tour.prices ?? []).map((pr, i) => (i === idx ? { ...pr, ...p } : pr)));
  const removePrice = (tour: Tour, idx: number) =>
    setPrices(tour, (tour.prices ?? []).filter((_, i) => i !== idx));

  const items: RailItem[] = tours.map((tour) => {
    const first = (tour.prices ?? [])[0];
    return {
      id: tour.id,
      title: tour.name,
      meta: first ? `${first.amount} ${first.currency}` : t("pricesLabel"),
      flag: tour.confidence != null && tour.confidence < 0.6,
      missing: !tour.name.trim(),
    };
  });

  return (
    <>
    <Workspace
      rail={
        <Rail
          ns="tours"
          heading={t("toursTitle")}
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          addLabel={t("addTour")}
          onAdd={add}
          missingLabel={t("missingFlag")}
        />
      }
      detail={
        selected ? (
          <DetailPane id={selected.id}>
            <div className="mb-4 flex items-center justify-between gap-3">
              {selected.confidence != null && selected.confidence < 0.6 ? <ReviewBadge label={t("reviewFlag")} /> : <span />}
              <DeleteButton onClick={() => setConfirmDelete(true)} />
            </div>

            <label className={FIELD_LABEL}>{t("tourNameLabel")}</label>
            <input
              type="text"
              value={selected.name}
              onChange={(e) => patch(selected.id, { name: e.target.value })}
              placeholder={t("tourNamePlaceholder")}
              className={`${INPUT} h-12 text-base font-semibold`}
            />

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <label className={FIELD_LABEL}>{t("pricesLabel")}</label>
              <div className="space-y-2">
                {(selected.prices ?? []).map((p, pi) => (
                  <div key={pi} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.label ?? ""}
                      onChange={(e) => updatePrice(selected, pi, { label: e.target.value || undefined })}
                      placeholder={t("priceLabelPlaceholder")}
                      className={`${INPUT_BASE} h-10 flex-1 min-w-0`}
                    />
                    <input
                      type="number"
                      value={Number.isFinite(p.amount) ? p.amount : ""}
                      onChange={(e) => updatePrice(selected, pi, { amount: e.target.value === "" ? 0 : Number(e.target.value) })}
                      placeholder="0"
                      className={`${INPUT_BASE} h-10 w-24 text-right font-semibold`}
                    />
                    <select
                      value={p.currency}
                      onChange={(e) => updatePrice(selected, pi, { currency: e.target.value })}
                      className="h-10 w-[5.25rem] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-navy-900 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {(CURRENCIES.includes(p.currency) ? CURRENCIES : [p.currency, ...CURRENCIES]).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removePrice(selected, pi)}
                      className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:text-red-500 cursor-pointer"
                      aria-label="remove price"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addPrice(selected)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 cursor-pointer"
                >
                  <PlusIcon /> {t("addPrice")}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className={FIELD_LABEL}>{t("notesLabel")}</label>
              <textarea
                value={selected.info}
                onChange={(e) => patch(selected.id, { info: e.target.value })}
                placeholder={t("tourInfoPlaceholder")}
                rows={5}
                className={TEXTAREA}
              />
            </div>
          </DetailPane>
        ) : (
          <EmptyDetail text={t("toursEmpty")} addLabel={t("addTour")} onAdd={add} />
        )
      }
    />
    <ConfirmDialog
      open={confirmDelete}
      title={t("confirmDeleteTourTitle")}
      message={t("confirmDeleteTour")}
      cancelLabel={t("cancelLabel")}
      confirmLabel={t("deleteLabel")}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={() => {
        if (selected) remove(selected.id);
        setConfirmDelete(false);
      }}
    />
    </>
  );
}

/* ─────────────── Business ─────────────── */
export function BusinessSplit({ business, onChange }: { business: BusinessSection[]; onChange: (v: BusinessSection[]) => void }) {
  const t = useTranslations("onboarding.steps.tours");
  const [selectedId, setSelectedId] = useSelection(business.map((x) => x.id));
  const selected = business.find((x) => x.id === selectedId) ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const add = () => {
    const id = crypto.randomUUID();
    onChange([...business, { id, title: "", content: "", source: "manual" }]);
    setSelectedId(id);
  };
  const remove = (id: string) => onChange(business.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<BusinessSection>) =>
    onChange(business.map((x) => (x.id === id ? { ...x, ...p, confidence: undefined } : x)));

  const items: RailItem[] = business.map((s) => ({
    id: s.id,
    title: s.title,
    meta: s.content.replace(/\s+/g, " ").trim(),
    flag: s.confidence != null && s.confidence < 0.6,
    missing: !s.title.trim() || !s.content.trim(),
  }));

  return (
    <>
    <Workspace
      rail={
        <Rail
          ns="business"
          heading={t("businessTitle")}
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          addLabel={t("addBusiness")}
          onAdd={add}
          missingLabel={t("missingFlag")}
        />
      }
      detail={
        selected ? (
          <DetailPane id={selected.id}>
            <div className="mb-4 flex items-center justify-between gap-3">
              {selected.confidence != null && selected.confidence < 0.6 ? <ReviewBadge label={t("reviewFlag")} /> : <span />}
              <DeleteButton onClick={() => setConfirmDelete(true)} />
            </div>
            <label className={FIELD_LABEL}>{t("businessTitleLabel")}</label>
            <input
              type="text"
              value={selected.title}
              onChange={(e) => patch(selected.id, { title: e.target.value })}
              placeholder={t("businessTitlePlaceholder")}
              className={`${INPUT} h-12 text-base font-semibold`}
            />
            <div className="mt-5">
              <label className={FIELD_LABEL}>{t("businessContentLabel")}</label>
              <textarea
                value={selected.content}
                onChange={(e) => patch(selected.id, { content: e.target.value })}
                placeholder={t("businessContentPlaceholder")}
                rows={9}
                className={TEXTAREA}
              />
            </div>
          </DetailPane>
        ) : (
          <EmptyDetail text={t("businessEmpty")} addLabel={t("addBusiness")} onAdd={add} />
        )
      }
    />
    <ConfirmDialog
      open={confirmDelete}
      title={t("confirmDeleteBusinessTitle")}
      message={t("confirmDeleteBusiness")}
      cancelLabel={t("cancelLabel")}
      confirmLabel={t("deleteLabel")}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={() => {
        if (selected) remove(selected.id);
        setConfirmDelete(false);
      }}
    />
    </>
  );
}

/* ─────────────── FAQs ─────────────── */
export function FaqsSplit({ faqs, onChange }: { faqs: FaqDraft[]; onChange: (v: FaqDraft[]) => void }) {
  const t = useTranslations("onboarding.steps.tours");
  const [selectedId, setSelectedId] = useSelection(faqs.map((x) => x.id));
  const selected = faqs.find((x) => x.id === selectedId) ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const add = () => {
    const id = crypto.randomUUID();
    onChange([...faqs, { id, question: "", answer: "" }]);
    setSelectedId(id);
  };
  const remove = (id: string) => onChange(faqs.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<FaqDraft>) =>
    onChange(faqs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const items: RailItem[] = faqs.map((f) => ({
    id: f.id,
    title: f.question,
    meta: f.answer.replace(/\s+/g, " ").trim(),
    missing: !f.question.trim() || !f.answer.trim(),
  }));

  return (
    <>
    <Workspace
      rail={
        <Rail
          ns="faqs"
          heading={t("faqsTitle")}
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          addLabel={t("addFaq")}
          onAdd={add}
          missingLabel={t("missingFlag")}
        />
      }
      detail={
        selected ? (
          <DetailPane id={selected.id}>
            <div className="mb-4 flex items-center justify-end">
              <DeleteButton onClick={() => setConfirmDelete(true)} />
            </div>
            <label className={FIELD_LABEL}>{t("faqQuestionLabel")}</label>
            <input
              type="text"
              value={selected.question}
              onChange={(e) => patch(selected.id, { question: e.target.value })}
              placeholder={t("faqQuestionPlaceholder")}
              className={`${INPUT} h-12 text-base font-semibold`}
            />
            <div className="mt-5">
              <label className={FIELD_LABEL}>{t("faqAnswerLabel")}</label>
              <textarea
                value={selected.answer}
                onChange={(e) => patch(selected.id, { answer: e.target.value })}
                placeholder={t("faqAnswerPlaceholder")}
                rows={8}
                className={TEXTAREA}
              />
            </div>
          </DetailPane>
        ) : (
          <EmptyDetail text={t("faqsEmpty")} addLabel={t("addFaq")} onAdd={add} />
        )
      }
    />
    <ConfirmDialog
      open={confirmDelete}
      title={t("confirmDeleteFaqTitle")}
      message={t("confirmDeleteFaq")}
      cancelLabel={t("cancelLabel")}
      confirmLabel={t("deleteLabel")}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={() => {
        if (selected) remove(selected.id);
        setConfirmDelete(false);
      }}
    />
    </>
  );
}
