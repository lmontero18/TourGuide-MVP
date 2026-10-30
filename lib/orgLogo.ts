// Logo de la agencia (flag orgBranding). Vive en el bucket publico org-logos:
// la URL es fija y se arma sin pedirle nada a Supabase. Cada subida usa un
// nombre nuevo (<org_id>/<timestamp>.<ext>), asi el navegador no muestra el
// logo viejo de la cache.
export const ORG_LOGO_BUCKET = 'org-logos'
export const ORG_LOGO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const ORG_LOGO_MAX_BYTES = 1024 * 1024

export function orgLogoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ORG_LOGO_BUCKET}/${path}`
}

// Sin logo: hasta dos iniciales del nombre ("Sarapiquí Outdoor Center" → "SO").
export function orgInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '·'
}
