import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const createSchema = z.object({
  org_name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
})

// POST — create the org for the current user (idempotent: returns existing org if already assigned)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  // Idempotent — already has an org, return it
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug, onboarded_at')
      .eq('id', profile.org_id)
      .single()
    return NextResponse.json({ success: true, organization: org })
  }

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { org_name, slug } = parsed.data
  const serviceClient = await createServiceClient()

  const { data: existingOrg } = await serviceClient
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingOrg) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  // Org is created without onboarded_at — the final Launch step sets it via PATCH
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: org_name, slug })
    .select('id, name, slug, onboarded_at')
    .single()

  if (orgError || !org) {
    console.error('Failed to create organization:', orgError)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  const { error: userError } = await serviceClient
    .from('users')
    .update({ org_id: org.id, role: 'admin' })
    .eq('id', user.id)

  if (userError) {
    console.error('Failed to assign user to org:', userError)
    return NextResponse.json({ error: 'Failed to assign user' }, { status: 500 })
  }

  const { error: subError } = await serviceClient
    .from('subscriptions')
    .insert({ org_id: org.id, plan: 'starter', status: 'trialing' })

  if (subError) {
    console.error('Failed to create subscription:', subError)
  }

  return NextResponse.json({ success: true, organization: org })
}

// PATCH — finalize onboarding by setting onboarded_at on the user's org
export async function PATCH() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'User has no organization' }, { status: 400 })
  }
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const serviceClient = await createServiceClient()
  const { data: org, error } = await serviceClient
    .from('organizations')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', profile.org_id)
    .select('id, name, slug, onboarded_at')
    .single()

  if (error || !org) {
    console.error('Failed to finalize onboarding:', error)
    return NextResponse.json({ error: 'Failed to finalize onboarding' }, { status: 500 })
  }

  return NextResponse.json({ success: true, organization: org })
}
