// Confeti al marcar una venta como Reservado (flag celebrations): refuerza el
// habito que mas cuesta, registrar cada venta. La libreria se carga recien
// cuando hace falta. Con "reducir movimiento" activado no se muestra.
export async function celebrateSale() {
  const { default: confetti } = await import('canvas-confetti')
  const base = { disableForReducedMotion: true, zIndex: 60 }
  void confetti({ ...base, particleCount: 120, spread: 80, startVelocity: 45, origin: { y: 0.7 } })
  setTimeout(() => {
    void confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } })
    void confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } })
  }, 180)
}
