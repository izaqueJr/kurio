import type { OrderStatus } from '../domain'
import { findProduct, readDb, updateProduct, writeDb, type StoredOrder } from './db'
import { emitNftUpdated, emitOrderUpdated } from './realtime-server'

const timers = new Map<string, number>()

/**
 * Finaliza um pedido pendente. Pedidos confirmados ou recusados são terminais.
 * Na confirmação, baixa o estoque das edições e remove do carrinho apenas o que foi comprado.
 */
export function settleOrder(orderId: string, status: Exclude<OrderStatus, 'pending'>, failureReason?: string) {
  const db = readDb()
  const order = db.orders.find((row) => row.id === orderId)
  if (!order || order.status !== 'pending') return order
  window.clearTimeout(timers.get(orderId))
  timers.delete(orderId)
  order.status = status
  order.version += 1
  order.settledAt = new Date().toISOString()
  order.settleAt = undefined
  if (status === 'declined') order.failureReason = failureReason ?? 'A carteira recusou a assinatura da transação.'
  const updatedProducts: Array<{ id: string; previousPrice: string }> = []
  if (status === 'confirmed') {
    const cart = db.carts[`user:${order.userId}`]
    for (const purchased of order.lines) {
      const nft = findProduct(db, purchased.nftId)
      const edition = nft?.editions.find((row) => row.label === purchased.edition)
      if (nft && edition) {
        const result = updateProduct(db, nft.id, { editions: [{ label: edition.label, available: edition.available - purchased.quantity }] })
        if (result) updatedProducts.push({ id: nft.id, previousPrice: result.previousPrice })
      }
      const line = cart?.lines.find((row) => row.id === purchased.id)
      if (cart && line) {
        line.quantity -= purchased.quantity
        if (line.quantity <= 0) cart.lines = cart.lines.filter((row) => row !== line)
      }
    }
    if (cart) {
      if (!cart.lines.length) cart.coupon = undefined
      cart.version += 1
    }
  }
  writeDb(db)
  emitOrderUpdated(order)
  for (const { id, previousPrice } of updatedProducts) {
    const nft = findProduct(db, id)
    if (nft) emitNftUpdated(nft, previousPrice)
  }
  return order
}

function settleTarget(order: StoredOrder): Exclude<OrderStatus, 'pending'> {
  return order.outcome
}

/** Liquida pedidos cujo prazo já passou (ex.: após recarregar a página durante o processamento). */
export function settleDueOrders() {
  const now = Date.now()
  for (const order of readDb().orders) {
    if (order.status === 'pending' && order.settleAt && order.settleAt <= now) settleOrder(order.id, settleTarget(order))
  }
}

export function scheduleSettlement(order: StoredOrder) {
  if (!order.settleAt || order.status !== 'pending') return
  window.clearTimeout(timers.get(order.id))
  const wait = Math.max(0, order.settleAt - Date.now())
  timers.set(order.id, window.setTimeout(() => settleOrder(order.id, settleTarget(order)), wait))
}

export function schedulePendingOrders() {
  for (const order of readDb().orders) scheduleSettlement(order)
}
