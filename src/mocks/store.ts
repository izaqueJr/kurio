import type { Cart, Order, User, Wallet } from '../domain'

const key = 'kurio-mock-store-v1'

type Store = { user?: User; cart: Cart; wallets: Wallet[]; favorites: string[]; orders: Order[] }
const initial: Store = {
  cart: { items: [], version: 1 },
  wallets: [{ id: 'wallet-1', label: 'Carteira principal', address: '0x71C8...8Bf1', network: 'Ethereum', primary: true }],
  favorites: [],
  orders: [],
}

export function readStore(): Store {
  try { return { ...initial, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return structuredClone(initial) }
}
export function writeStore(store: Store) { localStorage.setItem(key, JSON.stringify(store)); return store }
export function resetStore() { localStorage.removeItem(key); localStorage.removeItem('kurio-session') }
