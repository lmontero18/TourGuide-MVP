import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Hosts que nunca se deben fetchear desde el servidor (SSRF): loopback,
// rangos privados y link-local. El dashboard solo previsualiza links
// públicos que mandan los clientes por WhatsApp.
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host === '[::1]') return true
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) return false
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
  return (
    a === 127 ||
    a === 10 ||
    a === 0 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  )
}

function extractMeta(html: string, property: string): string | null {
  // property="og:x" content="..." en cualquier orden de atributos
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const target = request.nextUrl.searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        // Algunos sitios sirven OG tags solo a crawlers conocidos
        'User-Agent': 'Mozilla/5.0 (compatible; TourfyBot/1.0; +https://www.tourfy.app)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5_000),
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok || !contentType.includes('text/html')) {
      return NextResponse.json({ preview: null }, { status: 200 })
    }

    // Solo el inicio del documento — los OG tags viven en el <head>
    const html = (await res.text()).slice(0, 300_000)

    const image = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image')
    const title =
      extractMeta(html, 'og:title') ??
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ??
      null
    const description = extractMeta(html, 'og:description') ?? extractMeta(html, 'description')
    const siteName = extractMeta(html, 'og:site_name')

    // og:image relativa → absoluta contra la URL final
    let imageUrl: string | null = null
    if (image) {
      try {
        const abs = new URL(image, res.url ?? parsed)
        if (['http:', 'https:'].includes(abs.protocol) && !isPrivateHost(abs.hostname)) {
          imageUrl = abs.toString()
        }
      } catch {
        imageUrl = null
      }
    }

    const preview = title || imageUrl
      ? {
          url: parsed.toString(),
          title: title ? decodeEntities(title.trim()).slice(0, 200) : null,
          description: description ? decodeEntities(description.trim()).slice(0, 300) : null,
          image: imageUrl,
          siteName: siteName ? decodeEntities(siteName.trim()).slice(0, 100) : null,
        }
      : null

    return NextResponse.json(
      { preview },
      // Los OG tags de una URL casi no cambian — cachear 1h en el edge de Vercel
      { headers: { 'Cache-Control': 'private, max-age=3600' } }
    )
  } catch {
    // Sitio caído, timeout o bloqueo: el chat sigue funcionando sin preview
    return NextResponse.json({ preview: null }, { status: 200 })
  }
}
