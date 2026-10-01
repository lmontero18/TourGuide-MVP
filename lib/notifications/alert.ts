// Avisos del dashboard en el navegador (CODE-175): sonido + notificacion del
// sistema. Sin assets: el sonido (marca sonora de Tourfy) se genera con Web Audio.

let audioCtx: AudioContext | null = null

// Marca sonora "Brujula": tres notas que suben (G5-B5-D6) con timbre de
// campana (sintesis FM). La urgente repite la firma y remata una octava arriba,
// asi se distingue sin mirar. Elegida entre 4 propuestas el 2026-09-30.
export type ChimeKind = 'urgent' | 'message'

const BRUJULA: Record<ChimeKind, [freq: number, at: number][]> = {
  message: [[784, 0], [988, 0.11], [1175, 0.22]],
  urgent: [[784, 0], [988, 0.09], [1175, 0.18], [784, 0.42], [988, 0.51], [1568, 0.6]],
}

const PEAK = 0.28

function bell(ctx: AudioContext, freq: number, at: number) {
  // FM: modulador inarmonico (3.5x) que se apaga rapido = brillo de campana.
  const carrier = ctx.createOscillator()
  const modulator = ctx.createOscillator()
  const modGain = ctx.createGain()
  const out = ctx.createGain()
  carrier.frequency.value = freq
  modulator.frequency.value = freq * 3.5
  modGain.gain.setValueAtTime(freq * 2.2, at)
  modGain.gain.exponentialRampToValueAtTime(1, at + 0.5)
  out.gain.setValueAtTime(0.0001, at)
  out.gain.exponentialRampToValueAtTime(PEAK, at + 0.005)
  out.gain.exponentialRampToValueAtTime(0.0001, at + 0.7)
  modulator.connect(modGain).connect(carrier.frequency)
  carrier.connect(out).connect(ctx.destination)
  for (const osc of [carrier, modulator]) {
    osc.start(at)
    osc.stop(at + 0.8)
  }
}

// Los navegadores solo dejan sonar audio despues de que el usuario
// interactuo con la pagina; si todavia no, falla en silencio.
export function playChime(kind: ChimeKind = 'message') {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.03
    for (const [freq, at] of BRUJULA[kind]) bell(ctx, freq, t0 + at)
  } catch {
    // Sin soporte o bloqueado por autoplay: el aviso visual alcanza.
  }
}

export function desktopSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

interface DesktopNotice {
  title: string
  body: string
  // Mismo tag = el sistema reemplaza la anterior: con varias pestañas abiertas
  // queda una sola notificacion por evento.
  tag: string
  onClick: () => void
}

export function showDesktopNotification({ title, body, tag, onClick }: DesktopNotice) {
  if (!desktopSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag, icon: '/app-icon.svg' })
    n.onclick = () => {
      window.focus()
      onClick()
      n.close()
    }
  } catch {
    // Safari viejo / contextos sin permiso: ignorar.
  }
}

// Con varias pestañas del dashboard abiertas, solo suena la que se uso por
// ultima vez (la notificacion del sistema ya se deduplica por tag).
const FOCUS_KEY = 'tourfy:notify:last-focus'
const TAB_ID = typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random())

export function markTabFocused() {
  try {
    localStorage.setItem(FOCUS_KEY, TAB_ID)
  } catch {}
}

export function isLastFocusedTab(): boolean {
  try {
    const last = localStorage.getItem(FOCUS_KEY)
    return !last || last === TAB_ID
  } catch {
    return true
  }
}
