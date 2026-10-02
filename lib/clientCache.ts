'use client'

// Cache en memoria de la pestaña: al volver a una pagina se muestra al
// instante lo ultimo que se vio y se refresca en segundo plano. Se vacia al
// cerrar sesion para que otro usuario en la misma pestaña no vea datos ajenos.
const store = new Map<string, unknown>()

// En el servidor (SSR de componentes cliente) no se lee ni escribe nada: el
// Map de modulo seria compartido entre requests de distintos usuarios.
const isBrowser = typeof window !== 'undefined'

export function readCache<T>(key: string): T | undefined {
  return isBrowser ? (store.get(key) as T | undefined) : undefined
}

export function writeCache(key: string, value: unknown): void {
  if (isBrowser) store.set(key, value)
}

export function clearClientCache(): void {
  store.clear()
}
