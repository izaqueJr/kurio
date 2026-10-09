import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { Nft, NftUpdatedEvent, OrderUpdatedEvent } from '../domain'
import { readDb, type StoredOrder } from './db'

type SocketIo = ReturnType<typeof toSocketIo>
type Connection = { io: SocketIo; close: () => void; userId?: string; ping: number }

const connections = new Set<Connection>()
/** Últimos eventos emitidos — usados para simular duplicatas e eventos atrasados. */
export const eventLog: Array<NftUpdatedEvent | OrderUpdatedEvent> = []
let subscribeListeners: Array<(userId?: string) => void> = []

export function onSubscribe(listener: (userId?: string) => void) {
  subscribeListeners.push(listener)
  return () => { subscribeListeners = subscribeListeners.filter((item) => item !== listener) }
}

function userIdFromToken(token?: string) {
  if (!token) return undefined
  const session = readDb().sessions.find((row) => row.token === token && row.expiresAt > Date.now())
  return session?.userId
}

function remember(event: NftUpdatedEvent | OrderUpdatedEvent) {
  eventLog.push(event)
  if (eventLog.length > 50) eventLog.shift()
}

export function emitNftUpdated(nft: Nft, previousPrice: string) {
  const event: NftUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: { price: nft.price, available: nft.available, editions: structuredClone(nft.editions), previousPrice },
  }
  remember(event)
  for (const connection of connections) connection.io.client.emit('nft.updated', event)
  return event
}

export function emitOrderUpdated(order: StoredOrder) {
  const event: OrderUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: { status: order.status, failureReason: order.failureReason },
  }
  remember(event)
  // Eventos privados só chegam às conexões autenticadas do dono do pedido.
  for (const connection of connections) if (connection.userId === order.userId) connection.io.client.emit('order.updated', event)
  return event
}

/** Reenvia um evento já emitido (duplicata) ou um evento arbitrário, sem alterar o estado da API. */
export function replayEvent(event: NftUpdatedEvent | OrderUpdatedEvent) {
  for (const connection of connections) {
    if (event.type === 'order.updated') {
      const owner = readDb().orders.find((order) => order.id === event.resource.id)?.userId
      if (connection.userId !== owner) continue
    }
    connection.io.client.emit(event.type, event)
  }
}

/** Derruba todas as conexões; o socket.io-client reconecta sozinho. */
export function dropConnections() {
  for (const connection of [...connections]) connection.close()
}

export function connectionCount() {
  return connections.size
}

const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
const realtime = ws.link(`${protocol}://${location.host}/realtime/`)

export const realtimeHandler = realtime.addEventListener('connection', (raw) => {
  const io = toSocketIo(raw)
  const connection: Connection = {
    io,
    close: () => raw.client.close(),
    // O servidor Engine.IO envia "ping" periodicamente; sem isso o cliente encerra por timeout.
    ping: window.setInterval(() => raw.client.send('2'), 20_000),
  }
  connections.add(connection)
  raw.client.addEventListener('close', () => {
    window.clearInterval(connection.ping)
    connections.delete(connection)
  })
  io.client.on('subscribe', (_event, payload?: { token?: string }) => {
    connection.userId = userIdFromToken(payload?.token)
    io.client.emit('subscribed', { authenticated: Boolean(connection.userId) })
    for (const listener of subscribeListeners) listener(connection.userId)
  })
})
