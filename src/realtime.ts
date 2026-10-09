import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { eth, type Cart, type Nft, type NftListResponse, type NftUpdatedEvent, type Order, type OrderUpdatedEvent, type User } from './domain'
import { queryKeys } from './api/queries'
import { getSessionToken, subscribeSessionToken } from './api/session-storage'
import { transportReady } from './api/transport'
import { announce } from './lib/announcer'
import { clearNotices, pushNotice, setConnectionState } from './lib/realtime-notices'

/**
 * Cliente Socket.IO. Em demonstração o servidor é simulado pelo MSW
 * (`@mswjs/socket.io-binding`); com backend real basta apontar `VITE_SOCKET_URL`.
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? window.location.origin

/** Idempotência e ordenação dos eventos: ids já aplicados e última versão por recurso. */
export class EventLedger {
  private seen = new Set<string>()
  private versions = new Map<string, number>()

  accept(event: { eventId: string; resource: { type: string; id: string }; version: number }) {
    const key = `${event.resource.type}:${event.resource.id}`
    if (this.seen.has(event.eventId)) return false
    this.seen.add(event.eventId)
    if (this.seen.size > 500) this.seen.delete(this.seen.values().next().value as string)
    if ((this.versions.get(key) ?? 0) >= event.version) return false
    this.versions.set(key, event.version)
    return true
  }

  observe(type: string, id: string, version: number) {
    const key = `${type}:${id}`
    if ((this.versions.get(key) ?? 0) < version) this.versions.set(key, version)
  }

  reset() {
    this.seen.clear()
    this.versions.clear()
  }
}

function applyNftUpdate(queryClient: QueryClient, event: NftUpdatedEvent) {
  const merge = (nft: Nft): Nft => (nft.id === event.resource.id && nft.version < event.version
    ? { ...nft, price: event.data.price, available: event.data.available, editions: event.data.editions, version: event.version }
    : nft)
  const previous = queryClient.getQueryData<Nft>(queryKeys.nft(event.resource.id))
  queryClient.setQueryData<Nft>(queryKeys.nft(event.resource.id), (nft) => (nft ? merge(nft) : nft))
  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nftsRoot }, (list) => (list ? { ...list, items: list.items.map(merge) } : list))

  const carts = queryClient.getQueriesData<Cart>({ queryKey: queryKeys.cartRoot })
  const line = carts.flatMap(([, cart]) => cart?.lines ?? []).find((row) => row.nftId === event.resource.id)
  const name = line ? `${line.nft.name} ${line.nft.token}` : previous ? `${previous.name} ${previous.token}` : undefined
  if (line && name) {
    const priceChanged = event.data.previousPrice !== event.data.price
    const edition = event.data.editions.find((row) => row.label === line.edition)
    const message = priceChanged
      ? `${name}: o preço mudou de ${eth(event.data.previousPrice)} para ${eth(event.data.price)}. O resumo foi atualizado.`
      : edition && edition.available < line.quantity
        ? `${name}: restam ${edition.available} unidade(s) da edição ${line.edition}. Ajuste a quantidade para continuar.`
        : `${name}: a disponibilidade foi atualizada.`
    pushNotice({ id: event.eventId, nftId: event.resource.id, message })
    announce(message, 'assertive')
    void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot })
    void queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot })
  }
}

function applyOrderUpdate(queryClient: QueryClient, event: OrderUpdatedEvent) {
  const user = queryClient.getQueryData<User | null>(queryKeys.session)
  if (!user) return
  const key = queryKeys.order(user.id, event.resource.id)
  const current = queryClient.getQueryData<Order>(key)
  if (current && current.version >= event.version) return
  if (current) queryClient.setQueryData<Order>(key, { ...current, status: event.data.status, failureReason: event.data.failureReason, version: event.version })
  void queryClient.invalidateQueries({ queryKey: key })
  if (event.data.status === 'confirmed') {
    announce('Pagamento confirmado. Seus NFTs estão na carteira.')
    void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot })
  }
  if (event.data.status === 'declined') announce('Pagamento recusado. Os itens continuam no seu carrinho.', 'assertive')
}

/** Reconciliação após (re)conexão: o REST é a fonte da verdade para recursos ativos. */
function reconcile(queryClient: QueryClient) {
  for (const key of [queryKeys.cartRoot, queryKeys.quoteRoot, queryKeys.orderRoot, ['nft'], queryKeys.nftsRoot]) {
    void queryClient.invalidateQueries({ queryKey: key, refetchType: 'active' })
  }
}

export function subscribeRealtime(queryClient: QueryClient) {
  const ledger = new EventLedger()
  let socket: Socket | undefined
  let connectedOnce = false

  let generation = 0
  const open = async () => {
    const opening = ++generation
    // Carregado sob demanda: o engine.io captura `globalThis.WebSocket` ao ser avaliado e,
    // em demonstração, precisa enxergar a versão interceptada pelo MSW.
    await transportReady
    const { io } = await import('socket.io-client')
    if (opening !== generation) return
    const token = getSessionToken()
    socket = io(SOCKET_URL, { path: '/realtime', transports: ['websocket'], autoConnect: false, reconnectionDelay: 500, reconnectionDelayMax: 3_000 })
    const current = socket
    setConnectionState('connecting')
    current.on('connect', () => {
      setConnectionState('connected')
      current.emit('subscribe', { token })
      if (connectedOnce) reconcile(queryClient)
      connectedOnce = true
    })
    current.on('disconnect', (reason) => setConnectionState(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting'))
    current.io.on('reconnect_attempt', () => setConnectionState('reconnecting'))
    current.on('nft.updated', (event: NftUpdatedEvent) => {
      if (socket !== current || !ledger.accept(event)) return
      applyNftUpdate(queryClient, event)
    })
    current.on('order.updated', (event: OrderUpdatedEvent) => {
      if (socket !== current || !ledger.accept(event)) return
      applyOrderUpdate(queryClient, event)
    })
    current.connect()
  }

  const close = () => {
    generation += 1
    socket?.removeAllListeners()
    socket?.io.removeAllListeners()
    socket?.disconnect()
    socket = undefined
    setConnectionState('disconnected')
  }

  // Versões vindas do REST também contam: um evento mais antigo que a resposta não regride o estado.
  const unsubscribeCache = queryClient.getQueryCache().subscribe(({ type, query }) => {
    if (type !== 'updated' || query.state.status !== 'success') return
    const [scope] = query.queryKey as [string]
    const data = query.state.data as Nft | Order | undefined
    if (scope === 'nft' && data && 'editions' in data) ledger.observe('nft', data.id, data.version)
    if (scope === 'order' && data && 'transactionHash' in data) ledger.observe('order', data.id, data.version)
  })

  // Troca de sessão: nova conexão, sem herdar eventos ou assinaturas da sessão anterior.
  const unsubscribeSession = subscribeSessionToken(() => {
    close()
    ledger.reset()
    clearNotices()
    connectedOnce = false
    void open()
  })

  void open()
  return () => {
    unsubscribeSession()
    unsubscribeCache()
    close()
  }
}
