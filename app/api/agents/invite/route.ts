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

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: full_name || null,
      role,
      org_id: adminProfile.org_id,
    },
  })

  if (inviteError) {
    log.error('failed to invite agent', { error: inviteError, org_id: adminProfile.org_id })
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    user: {
      id: inviteData.user.id,
      email: inviteData.user.email,
    },
  })
}
