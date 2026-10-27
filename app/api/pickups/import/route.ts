import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { requireKnowledgeEditor } from '@/lib/auth/requireKnowledgeEditor'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { hasFeature } from '@/lib/features'
import { parsePickupWorkbook } from '@/lib/pickups/parseSheet'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'pickups/import' })

const MAX_BYTES = 5 * 1024 * 1024
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// POST — lee el Excel de recogidas y devuelve un borrador para revisar.
// NO guarda nada: el guardado es el PUT de /api/pickups despues de revisar.
export async function POST(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const auth = await requireKnowledgeEditor()
  if (!auth.ok) return auth.response
  if (!hasFeature(await getOrgFeatureFlags(auth.orgId), 'pickups')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  // Solo .xlsx: el .xls viejo es otro formato que exceljs no lee.
  if (!file.name.toLowerCase().endsWith('.xlsx') && file.type !== XLSX_MIME) {
    return NextResponse.json({ error: t('pickupsXlsxOnly') }, { status: 400 })
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: t('pickupsFileTooBig') }, { status: 400 })

  try {
    const draft = await parsePickupWorkbook(await file.arrayBuffer())
    if (!draft.zones.length || !draft.columns.length) {
      return NextResponse.json({ error: t('pickupsNothingFound') }, { status: 422 })
    }
    return NextResponse.json({ draft })
  } catch (error) {
    // Un archivo roto o protegido con clave no es un error nuestro: se avisa.
    log.warn('could not read pickups workbook', { error, org_id: auth.orgId })
    return NextResponse.json({ error: t('pickupsUnreadable') }, { status: 422 })
  }
}
