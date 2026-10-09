import type { NftUpdatedEvent, OrderStatus, OrderUpdatedEvent } from '../domain'
import { findProduct, readDb, resetDb, updateProduct, writeDb } from './db'
import { schedulePendingOrders, settleOrder } from './orders'
import { connectionCount, dropConnections, emitNftUpdated, eventLog, onSubscribe, replayEvent } from './realtime-server'
import { getScenario, SCENARIOS, setScenario, type Scenario } from './scenarios'

/**
 * Controles da simulação, expostos em `window.__kurioMocks` apenas quando o MSW está ativo.
 * Usados na demonstração e pelos testes Playwright para controlar cenários e eventos.
 * Toda alteração passa pelo "banco" simulado: REST e Socket.IO refletem o mesmo estado.
 */
export const mockControls = {
  scenarios: SCENARIOS,
  getScenario,
  setScenario: (value: Scenario) => setScenario(value),
  reset: () => {
    resetDb()
    setScenario('default')
  },
  /** Altera preço/disponibilidade de um NFT e emite `nft.updated`. */
  updateNft(id: string, patch: { price?: string; editions?: Array<{ label: string; available: number }> }) {
    const db = readDb()
    const result = updateProduct(db, id, patch)
    if (!result) throw new Error(`NFT inexistente: ${id}`)
    writeDb(db)
    return emitNftUpdated(result.nft, result.previousPrice)
  },
  settleOrder: (id: string, status: Exclude<OrderStatus, 'pending'>) => settleOrder(id, status),
  orders: () => readDb().orders.map(({ id, status, idempotencyKey, userId }) => ({ id, status, idempotencyKey, userId })),
  /** Reenvia o último evento emitido (duplicata com o mesmo eventId e versão). */
  replayLastEvent(type?: 'nft.updated' | 'order.updated') {
    const event = [...eventLog].reverse().find((row) => !type || row.type === type)
    if (event) replayEvent(event)
    return event
  },
  /** Envia um evento antigo: versão anterior à atual do recurso, com dados divergentes. */
  emitStaleNftEvent(id: string, price: string) {
    const nft = findProduct(readDb(), id)
    if (!nft) throw new Error(`NFT inexistente: ${id}`)
    const event: NftUpdatedEvent = {
      eventId: crypto.randomUUID(),
      type: 'nft.updated',
      resource: { type: 'nft', id },
      version: Math.max(0, nft.version - 1),
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      data: { price, available: nft.available, editions: nft.editions, previousPrice: nft.price },
    }
    replayEvent(event)
    return event
  },
  emitStaleOrderEvent(id: string, status: OrderStatus) {
    const order = readDb().orders.find((row) => row.id === id)
    if (!order) throw new Error(`Pedido inexistente: ${id}`)
    const event: OrderUpdatedEvent = {
      eventId: crypto.randomUUID(),
      type: 'order.updated',
      resource: { type: 'order', id },
      version: Math.max(0, order.version - 1),
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      data: { status },
    }
    replayEvent(event)
    return event
  },
  dropConnections,
  connectionCount,
}

export type MockControls = typeof mockControls

let marketTimer: number | undefined

function startLiveMarket() {
  if (marketTimer || getScenario() !== 'live-market') return
  marketTimer = window.setInterval(() => {
    const db = readDb()
    const ids = [...new Set(Object.values(db.carts).flatMap((cart) => cart.lines.map((line) => line.nftId)))]
    const id = ids[Math.floor(Date.now() / 15_000) % Math.max(ids.length, 1)]
    const nft = id ? findProduct(db, id) : undefined
    if (!nft) return
    const direction = nft.version % 2 === 0 ? -1 : 1
    mockControls.updateNft(nft.id, { price: Math.max(0.05, Number(nft.price) + direction * 0.03).toFixed(2) })
  }, 15_000)
}

export function installMockControls() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('reset-mocks')) mockControls.reset()
  const scenario = params.get('scenario')
  if (scenario && scenario in SCENARIOS) setScenario(scenario as Scenario)
  schedulePendingOrders()
  onSubscribe(() => startLiveMarket())
}

/** Exposto só depois que o worker intercepta a rede (os testes aguardam este sinal). */
export function exposeMockControls() {
  window.__kurioMocks = mockControls
}

declare global {
  interface Window { __kurioMocks?: MockControls }
}
