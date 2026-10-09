import type { QueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { products, type Nft, type Order } from './domain'

const socket = io(window.location.origin, { path: '/realtime', transports: ['websocket'], autoConnect: false, reconnection: true })

type NftUpdate = Pick<Nft, 'id' | 'price' | 'available' | 'version'>
type OrderUpdate = Pick<Order, 'id' | 'status'> & { version: number }

export function subscribeRealtime(queryClient: QueryClient) {
  const onNftUpdate = (event: NftUpdate) => {
    const fixture = products.find((nft) => nft.id === event.id)
    if (fixture && fixture.version < event.version) Object.assign(fixture, event)
    queryClient.setQueryData<Nft>(['nft', event.id], (current) => !current || current.version >= event.version ? current : { ...current, ...event })
    queryClient.setQueryData(['realtime-notice'], 'Preço ou disponibilidade de um NFT foram atualizados.')
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
    void queryClient.invalidateQueries({ queryKey: ['quote'] })
    void queryClient.invalidateQueries({ queryKey: ['nfts'] })
  }
  const onOrderUpdate = (event: OrderUpdate) => {
    queryClient.setQueryData<Order>(['order', event.id], (current) => !current || (current as Order & { version?: number }).version && (current as Order & { version: number }).version >= event.version ? current : { ...current, ...event })
  }
  const subscribe = () => {
    socket.emit('subscribe', { resources: ['nft', 'order'] })
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
    void queryClient.invalidateQueries({ queryKey: ['quote'] })
  }
  socket.on('nft.updated', onNftUpdate)
  socket.on('order.updated', onOrderUpdate)
  socket.on('connect', subscribe)
  socket.on('reconnect', subscribe)
  socket.connect()
  return () => { socket.off('nft.updated', onNftUpdate); socket.off('order.updated', onOrderUpdate); socket.off('connect', subscribe); socket.off('reconnect', subscribe); socket.disconnect() }
}
