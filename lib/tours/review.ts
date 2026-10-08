import type { Tour } from "@/types";

// Bajo este umbral la extraccion por IA se marca para revisar (ver types: confidence).
export const REVIEW_THRESHOLD = 0.6;

export type ReviewReason = "lowConfidence" | "noPrice" | "noDetails";

// Que le falta a un tour para que el bot lo responda bien. Un tour sin precio
// hace que el bot diga "no tengo el precio" y pase al equipo; uno de baja
// certeza puede tener datos mal leidos de la web.
export function reviewReasons(tour: Tour): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (typeof tour.confidence === "number" && tour.confidence < REVIEW_THRESHOLD) reasons.push("lowConfidence");
  if (!(tour.prices ?? []).some((p) => Number.isFinite(p.amount))) reasons.push("noPrice");
  if (!tour.info.trim()) reasons.push("noDetails");
  return reasons;
}

export const needsReview = (tour: Tour) => reviewReasons(tour).length > 0;
