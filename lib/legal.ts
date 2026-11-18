// Datos legales de Tourfy en un solo lugar: la entidad que factura en Stripe,
// firma los Términos y es responsable en la Política de privacidad.
export const LEGAL_NAME = 'NOMADAI LLC'
export const LEGAL_ADDRESS = '30 North Gould Street, Ste N, Sheridan, Wyoming 82801, USA'
export const CONTACT_EMAIL = 'naia@naiaautomate.com'

// Fecha de ultima edicion de cada pagina legal (yyyy-mm-dd). Es la que se
// muestra en la pagina y el `lastmod` del sitemap: al editar el texto, subirla.
export const TERMS_UPDATED = '2026-11-07'
export const PRIVACY_UPDATED = '2026-10-07'
export const DATA_DELETION_UPDATED = '2026-10-07'

// "November 7, 2026" / "7 de noviembre de 2026"
export function formatLegalDate(isoDate: string, lang: 'en' | 'es'): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
