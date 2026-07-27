import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'agents/invite' })

const inviteSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  full_name: z.string().trim().max(100).optional(),
  role: z.enum(['admin', 'agent']).default('agent'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.org_id) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { email, full_name, role } = parsed.data

  // Use service role to invite user via Supabase Auth
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  // role y org_id NO viajan en la metadata del usuario. handle_new_user() dejo de
  // leerlos de ahi (ver 20260727140000_handle_new_user_no_privesc.sql): eran input
  // controlable por quien se registra, y un signup directo contra GoTrue con la
  // anon key daba admin de cualquier org. La asignacion se hace aca abajo, con
  // service client, despues de haber verificado que quien invita es admin.
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name || null },
  })

  if (inviteError) {
    log.error('failed to invite agent', { error: inviteError, org_id: adminProfile.org_id })
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 400 })
  }

  // El trigger ya creo la fila con role='admin' y org_id=null. Asignarle la org y
  // el rol reales. Si esto falla el invitado queda sin org y caeria en /onboarding
  // creando una org propia, asi que se reporta como error.
  const { error: assignError } = await serviceClient
    .from('users')
    .update({ org_id: adminProfile.org_id, role })
    .eq('id', inviteData.user.id)

  if (assignError) {
    log.error('failed to assign org to invited agent', {
      error: assignError,
      org_id: adminProfile.org_id,
      invited_user_id: inviteData.user.id,
    })
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    user: {
      id: inviteData.user.id,
      email: inviteData.user.email,
    },
  })
}
