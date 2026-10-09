import { useSyncExternalStore } from 'react'

/**
 * Anúncios acessíveis para mutations e eventos em tempo real.
 * Renderizados por <LiveAnnouncer /> em regiões `aria-live` persistentes.
 */
export type Announcement = { id: number; message: string; tone: 'polite' | 'assertive' }

let current: Announcement | null = null
let sequence = 0
const listeners = new Set<() => void>()

export function announce(message: string, tone: Announcement['tone'] = 'polite') {
  sequence += 1
  current = { id: sequence, message, tone }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useAnnouncement() {
  return useSyncExternalStore(subscribe, () => current, () => null)
}
