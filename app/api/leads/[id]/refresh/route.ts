import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { refreshLead } from '@/lib/leads/sync'

// "Actualizar con IA": vuelve a leer la conversacion del lead sin throttle.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })

  // RLS: solo encuentra leads de la propia org.
  const { data: lead } = await supabase.from('leads').select('conversation_id').eq('id', id).maybeSingle()
  if (!lead?.conversation_id) return NextResponse.json({ error: t('leadNotFound') }, { status: 404 })
  // En un lead cerrado no se reescribe su ficha: se revisa si los mensajes
  // nuevos traen una oportunidad nueva (y si es asi se abre otro lead).

  await refreshLead(await createServiceClient(), lead.conversation_id, { force: true })
  return NextResponse.json({ ok: true })
}
