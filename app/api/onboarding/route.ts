import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check user doesn't already have an org
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (profile?.org_id) {
    return NextResponse.json({ error: 'User already belongs to an organization' }, { status: 400 })
  }

  const body = await request.json()
  const { org_name, slug } = body as { org_name: string; slug: string }

  if (!org_name || !slug) {
    return NextResponse.json({ error: 'Missing org_name or slug' }, { status: 400 })
  }

  // Validate slug format (lowercase alphanumeric + hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 })
  }

  // Use service role to create org (bypasses RLS)
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  // Check slug uniqueness
  const { data: existingOrg } = await serviceClient
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingOrg) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  // Create organization — onboarded_at marks completion of the onboarding wizard
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: org_name, slug, onboarded_at: new Date().toISOString() })
    .select('id, name, slug')
    .single()

  if (orgError || !org) {
    console.error('Failed to create organization:', orgError)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  // Assign user to org as admin
  const { error: userError } = await serviceClient
    .from('users')
    .update({ org_id: org.id, role: 'admin' })
    .eq('id', user.id)

  if (userError) {
    console.error('Failed to assign user to org:', userError)
    return NextResponse.json({ error: 'Failed to assign user' }, { status: 500 })
  }

  // Create starter subscription
  const { error: subError } = await serviceClient
    .from('subscriptions')
    .insert({
      org_id: org.id,
      plan: 'starter',
      status: 'trialing',
    })

  if (subError) {
    console.error('Failed to create subscription:', subError)
    // Non-critical, don't fail onboarding
  }

  return NextResponse.json({ success: true, organization: org })
}
