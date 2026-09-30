import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'agents' })

// Lista del equipo de la org. El estado (pendiente / activo) vive en
// auth.users, que solo se lee con service role — por eso es API route y no
// un select desde el cliente.
export async function GET() {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response

  const service = await createServiceClient()
  const { data: members, error } = await service
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('org_id', ctx.orgId)
    .order('created_at', { ascending: true })

  if (error) {
    log.error('failed to list agents', { error, org_id: ctx.orgId })
    return NextResponse.json({ error: 'Failed to load team' }, { status: 500 })
  }

  // Equipos chicos (decenas): un getUserById por miembro. listUsers pagina
  // sobre TODOS los usuarios del proyecto, no sirve para filtrar por org.
  const agents = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await service.auth.admin.getUserById(m.id)
      const authUser = data?.user
      return {
        id: m.id,
        email: m.email,
        full_name: m.full_name,
        role: m.role,
        status: authUser?.email_confirmed_at ? 'active' : 'pending',
        invited_at: authUser?.invited_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        is_self: m.id === ctx.userId,
      }
    })
  )

  return NextResponse.json({ agents })
}
