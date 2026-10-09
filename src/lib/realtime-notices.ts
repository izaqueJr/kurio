import { useSyncExternalStore } from 'react'

/** Avisos de alterações recebidas em tempo real para itens que o usuário está comprando. */
export type RealtimeNotice = { id: string; nftId: string; message: string }

let notices: RealtimeNotice[] = []
const listeners = new Set<() => void>()
const emit = () => { for (const listener of listeners) listener() }

export function pushNotice(notice: RealtimeNotice) {
  notices = [...notices.filter((row) => row.nftId !== notice.nftId), notice]
  emit()
}

export function clearNotices() {
  if (!notices.length) return
  notices = []
  emit()
}

export function useRealtimeNotices() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    () => notices,
    () => notices,
  )
}

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
let connection: ConnectionState = 'disconnected'
const connectionListeners = new Set<() => void>()

export function setConnectionState(next: ConnectionState) {
  connection = next
  for (const listener of connectionListeners) listener()
}

export function useConnectionState() {
  return useSyncExternalStore(
    (listener) => { connectionListeners.add(listener); return () => { connectionListeners.delete(listener) } },
    () => connection,
    () => connection,
  )
}
