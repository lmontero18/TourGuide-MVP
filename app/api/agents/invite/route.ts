import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const body = await request.json()
  const { email, full_name, role } = body as { email: string; full_name?: string; role?: 'admin' | 'agent' }

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  // Use service role to invite user via Supabase Auth
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: full_name || null,
      role: role || 'agent',
      org_id: adminProfile.org_id,
    },
  })

  if (inviteError) {
    console.error('Failed to invite agent:', inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    user: {
      id: inviteData.user.id,
      email: inviteData.user.email,
    },
  })
}
