import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import * as Sentry from '@sentry/nextjs'
import sharp from 'sharp'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { orgHasFeature } from '@/lib/features'
import { ORG_LOGO_BUCKET, ORG_LOGO_MAX_BYTES, ORG_LOGO_SIZE, ORG_LOGO_TYPES } from '@/lib/orgLogo'

const log = createLogger({ route: 'organizations/logo' })

// Logo de la agencia (flag orgBranding). Solo admins. organizations.logo_path
// y el bucket org-logos son de solo lectura para el cliente: se escriben aca
// con service role.
async function adminOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 401 as const }
  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role, organizations(logo_path)')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.org_id || profile.role !== 'admin') return { status: 403 as const }
  const org = profile.organizations as unknown as { logo_path: string | null } | null
  return { status: 200 as const, orgId: profile.org_id, previous: org?.logo_path ?? null }
}

// POST multipart con `file` → sube el logo nuevo y borra el anterior.
export async function POST(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const auth = await adminOrg()
  if (auth.status === 401) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  if (auth.status === 403) return NextResponse.json({ error: t('adminOnly') }, { status: 403 })

  const service = await createServiceClient()
  if (!(await orgHasFeature(service, auth.orgId, 'orgBranding'))) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  if (!ORG_LOGO_TYPES.includes(file.type)) return NextResponse.json({ error: t('logoType') }, { status: 400 })
  if (file.size > ORG_LOGO_MAX_BYTES) return NextResponse.json({ error: t('logoTooLarge') }, { status: 413 })

  const orgLog = log.child({ org_id: auth.orgId })
  // Se guarda achicado a ORG_LOGO_SIZE px (sin agrandar los chicos) en WebP
  // calidad alta: nitido en retina y pesa decenas de KB, no MB. WebP conserva
  // la transparencia de los PNG. rotate() aplica la orientacion EXIF de fotos.
  let logo: Buffer
  try {
    logo = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(ORG_LOGO_SIZE, ORG_LOGO_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer()
  } catch (error) {
    orgLog.warn('logo not an image', { error })
    return NextResponse.json({ error: t('logoType') }, { status: 400 })
  }

  const path = `${auth.orgId}/${Date.now()}.webp`
  const { error: uploadError } = await service.storage
    .from(ORG_LOGO_BUCKET)
    .upload(path, logo, { contentType: 'image/webp' })
  if (uploadError) {
    orgLog.error('logo upload failed', { error: uploadError })
    Sentry.captureException(new Error(`logo upload failed: ${uploadError.message}`), { tags: { org_id: auth.orgId } })
    return NextResponse.json({ error: t('uploadFailed') }, { status: 500 })
  }

  const { error } = await service.from('organizations').update({ logo_path: path }).eq('id', auth.orgId)
  if (error) {
    orgLog.error('logo save failed', { error })
    await service.storage.from(ORG_LOGO_BUCKET).remove([path])
    return NextResponse.json({ error: t('uploadFailed') }, { status: 500 })
  }

  if (auth.previous) await removeQuietly(auth.previous, orgLog)
  return NextResponse.json({ logo_path: path })
}

// DELETE → la agencia vuelve a las iniciales.
export async function DELETE() {
  const t = await getTranslations('apiErrors')
  const auth = await adminOrg()
  if (auth.status === 401) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  if (auth.status === 403) return NextResponse.json({ error: t('adminOnly') }, { status: 403 })

  const service = await createServiceClient()
  const orgLog = log.child({ org_id: auth.orgId })
  const { error } = await service.from('organizations').update({ logo_path: null }).eq('id', auth.orgId)
  if (error) {
    orgLog.error('logo remove failed', { error })
    return NextResponse.json({ error: t('logoSaveFailed') }, { status: 500 })
  }
  if (auth.previous) await removeQuietly(auth.previous, orgLog)
  return NextResponse.json({ logo_path: null })
}

// El archivo viejo es basura: si no se borra, no rompe nada.
async function removeQuietly(path: string, orgLog: ReturnType<typeof log.child>) {
  const service = await createServiceClient()
  const { error } = await service.storage.from(ORG_LOGO_BUCKET).remove([path])
  if (error) orgLog.warn('old logo not removed', { error, path })
}
