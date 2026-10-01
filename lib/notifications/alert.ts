// Avisos del dashboard en el navegador (CODE-175): sonido + notificacion del
// sistema. Sin assets: el sonido se genera con Web Audio.

let audioCtx: AudioContext | null = null

// Dos notas cortas ascendentes. Los navegadores solo dejan sonar audio despues
// de que el usuario interactuo con la pagina; si todavia no, falla en silencio.
export function playChime() {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const now = ctx.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    }
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
