import type { BusinessSection, FAQ, Tour } from "@/types";

export interface ImportResult {
  tours: Tour[];
  faqs: FAQ[];
  business: BusinessSection[];
  /** true si la página cargó pero casi no tenía texto (probable sitio JS-heavy). */
  thin: boolean;
}

function mapResult(result: { draft?: Partial<ImportResult>; thin?: boolean }): ImportResult {
  return {
    tours: result.draft?.tours ?? [],
    faqs: result.draft?.faqs ?? [],
    business: result.draft?.business ?? [],
    thin: Boolean(result.thin),
  };
}

// Wrapper de cliente para POST /api/import. Lo usan el onboarding y el editor del dashboard.
export async function importFromUrl(url: string): Promise<ImportResult> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "url", url }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "No pudimos importar desde esa URL");
  return mapResult(result);
}

const MAX_IMAGE_DIMENSION = 1600; // lado largo, en px
const IMAGE_QUALITY = 0.8;

// Redimensiona/comprime una imagen en el browser antes de subirla: baja el peso
// (evita el límite de body de la plataforma) y el costo de tokens de visión.
// Los PDF y formatos no-imagen se devuelven sin tocar.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // si no mejora, dejamos el original

    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // ante cualquier fallo, subimos el archivo original
  }
}

// Wrapper de cliente para subir un tarifario (PDF y/o fotos) a POST /api/import.
export async function importFromFiles(files: File[]): Promise<ImportResult> {
  const prepared = await Promise.all(files.map(compressImage));

  const fd = new FormData();
  for (const file of prepared) fd.append("files", file);

  // Sin header Content-Type: el browser lo setea con el boundary del multipart.
  const res = await fetch("/api/import", { method: "POST", body: fd });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "No pudimos procesar el archivo");
  return mapResult(result);
}
