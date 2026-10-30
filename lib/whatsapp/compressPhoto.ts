// Achica en el navegador las fotos que manda un agente, antes de subirlas a
// chat-media (flag compressAgentPhotos). WhatsApp solo acepta JPG/PNG, asi que
// sale JPG (no WebP como las entrantes). Fotos de celular y capturas en PNG
// pesaban ~350 KB en promedio y hasta 1 MB; asi quedan en ~150-250 KB, suben
// rapido con datos y se ven igual en WhatsApp (que igual las recomprime).
// Solo navegador: usa createImageBitmap + canvas.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.85
// Debajo de esto no vale la pena tocarla (y una captura chica en PNG se ve
// mejor como PNG).
const SKIP_BELOW_BYTES = 300 * 1024

export async function compressPhoto(file: File): Promise<File> {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') return file
  if (file.size <= SKIP_BELOW_BYTES) return file

  try {
    // imageOrientation: la foto de celular sale derecha (EXIF).
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // JPG no tiene transparencia: un PNG transparente queda sobre blanco, no negro.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    // Si por algun motivo no achico, se manda la original.
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}
