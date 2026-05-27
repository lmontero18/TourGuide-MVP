import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteContent } from "@/lib/ai/fetchSite";
import { extractFromText } from "@/lib/ai/extract";

// La extracción (fetch del sitio + llamada al LLM) puede tardar unos segundos.
export const maxDuration = 60;

const urlSchema = z.object({
  source: z.literal("url"),
  url: z.string().trim().min(4).max(2000),
});

// POST — extrae un borrador de tours+faqs desde una fuente. NO persiste nada;
// el guardado lo hace el flujo de aprobación vía PATCH /api/organizations.
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

  const parsed = urlSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const site = await fetchSiteContent(parsed.data.url);
    if (!site.usable) {
      // Pudimos cargar la página pero casi no hay texto (probable sitio JS-heavy).
      return NextResponse.json({ success: true, draft: { tours: [], faqs: [], business: [] }, thin: true });
    }

    const draft = await extractFromText(site.content, "url");
    return NextResponse.json({ success: true, draft });
  } catch (err) {
    console.error("Import failed:", err);
    const message = err instanceof Error ? err.message : "No pudimos importar desde esa URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
