import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteContent } from "@/lib/ai/fetchSite";
import { extractFromText, extractFromFiles, type ExtractionFile } from "@/lib/ai/extract";
import { ImportUserError } from "@/lib/ai/errors";

// La extracción puede tardar: visión sobre varias páginas de un tarifario es lenta.
export const maxDuration = 120;

const urlSchema = z.object({
  source: z.literal("url"),
  url: z.string().trim().min(4).max(2000),
});

// Límites de la subida de tarifarios.
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILES = 8;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB por archivo
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB en total

const EMPTY_DRAFT = { tours: [], faqs: [], business: [] };

// POST — extrae un borrador de tours+faqs desde una fuente (URL o tarifario).
// NO persiste nada; el guardado lo hace el flujo de aprobación vía PATCH /api/organizations.
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("multipart/form-data")
    ? handleFileImport(request)
    : handleUrlImport(request);
}

// Rama URL — lee el sitio y extrae el borrador.
async function handleUrlImport(request: NextRequest) {
  const parsed = urlSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const site = await fetchSiteContent(parsed.data.url);
    if (!site.usable) {
      // Pudimos cargar la página pero casi no hay texto (probable sitio JS-heavy).
      return NextResponse.json({ success: true, draft: EMPTY_DRAFT, thin: true });
    }

    const draft = await extractFromText(site.content, "url");
    return NextResponse.json({ success: true, draft });
  } catch (err) {
    console.error("Import failed:", err);
    // Solo ImportUserError es seguro de mostrar; errores del SDK (OpenAI, red)
    // filtran detalles internos en su message.
    const message = err instanceof ImportUserError ? err.message : "No pudimos importar desde esa URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// Rama tarifario — lee PDF/fotos subidos y extrae el borrador con visión.
async function handleFileImport(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "No pudimos leer los archivos" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No subiste ningún archivo" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos a la vez` }, { status: 400 });
  }

  let total = 0;
  for (const file of files) {
    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no soportado (PDF, JPG, PNG o WEBP)" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Cada archivo debe pesar máximo 10MB" }, { status: 400 });
    }
    total += file.size;
  }
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Los archivos juntos superan los 25MB" }, { status: 400 });
  }

  try {
    const extractionFiles: ExtractionFile[] = await Promise.all(
      files.map(async (file) => {
        const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        return {
          filename: file.name || "tarifario",
          mime: file.type,
          dataUrl: `data:${file.type};base64,${base64}`,
        };
      }),
    );

    const source = files.some((f) => f.type === "application/pdf") ? "pdf" : "photo";
    const draft = await extractFromFiles(extractionFiles, source);

    const isEmpty = draft.tours.length === 0 && draft.faqs.length === 0 && draft.business.length === 0;
    return NextResponse.json({ success: true, draft, thin: isEmpty });
  } catch (err) {
    console.error("File import failed:", err);
    const message = err instanceof ImportUserError ? err.message : "No pudimos procesar el archivo";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
