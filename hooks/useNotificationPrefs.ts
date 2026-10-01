'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { desktopSupported } from '@/lib/notifications/alert'

// Preferencias de avisos por navegador (CODE-175). localStorage + evento
// propio para que la campanita y el ConversationsProvider vean el mismo valor
// al instante, y el evento `storage` para sincronizar otras pestañas.
const SOUND_KEY = 'tourfy:notify:sound'
const DESKTOP_KEY = 'tourfy:notify:desktop'
const CHANGE_EVENT = 'tourfy:notify-prefs'

export type DesktopPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export interface NotificationPrefs {
  sound: boolean
  // El usuario quiere notificaciones del sistema Y el navegador las permite.
  desktop: boolean
  permission: DesktopPermission
}

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

function write(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function currentPermission(): DesktopPermission {
  return desktopSupported() ? Notification.permission : 'unsupported'
}

// useSyncExternalStore necesita un snapshot estable: se serializa a string.
function snapshot(): string {
  const permission = currentPermission()
  return JSON.stringify({
    sound: read(SOUND_KEY, true),
    desktop: read(DESKTOP_KEY, false) && permission === 'granted',
    permission,
  })
}

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

const SERVER_SNAPSHOT = JSON.stringify({ sound: true, desktop: false, permission: 'unsupported' })

export function useNotificationPrefs() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => SERVER_SNAPSHOT)
  const prefs = JSON.parse(raw) as NotificationPrefs

  const setSound = useCallback((on: boolean) => write(SOUND_KEY, on), [])

  // Activar pide permiso al navegador (tiene que ser desde un click).
  const setDesktop = useCallback(async (on: boolean) => {
    if (!on) return write(DESKTOP_KEY, false)
    if (!desktopSupported()) return
    const permission =
      Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    write(DESKTOP_KEY, permission === 'granted')
  }, [])

  return { ...prefs, setSound, setDesktop }
}
