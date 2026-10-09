import {
  addEth,
  compareEth,
  multiplyEth,
  percentageEth,
  subtractEth,
  type Cart,
  type CartLine,
  type Nft,
  type Order,
  type Quote,
  type Wallet,
} from '../domain'
import { coupons, NETWORK_FEE, seedFavorites, seedProducts, seedUsers, seedWallets, type UserRecord } from './fixtures'

const DB_KEY = 'kurio-mock-db-v3'

export type StoredLine = { id: string; nftId: string; edition: string; quantity: number }
export type StoredCart = { lines: StoredLine[]; coupon?: string; version: number }
export type SessionRecord = { token: string; userId: string; expiresAt: number }
export type StoredOrder = Order & { userId: string; fingerprint: string; settleAt?: number; outcome: 'confirmed' | 'declined'; lines: StoredLine[] }

export type Db = {
  products: Nft[]
  users: UserRecord[]
  sessions: SessionRecord[]
  carts: Record<string, StoredCart>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  orders: StoredOrder[]
  sequence: number
}

function seed(): Db {
  return {
    products: seedProducts(),
    users: structuredClone(seedUsers),
    sessions: [],
    carts: {},
    favorites: structuredClone(seedFavorites),
    wallets: structuredClone(seedWallets),
    orders: [],
    sequence: 0,
  }
}

let memory: Db | undefined

export function readDb(): Db {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(DB_KEY)
    memory = raw ? (JSON.parse(raw) as Db) : seed()
  } catch {
    memory = seed()
  }
  return memory
}

export function writeDb(db: Db) {
  memory = db
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* armazenamento indisponível: mantém em memória */ }
}

/** Restaura integralmente o cenário conhecido. */
export function resetDb() {
  memory = seed()
  writeDb(memory)
}

export function nextId(db: Db, prefix: string) {
  db.sequence += 1
  return `${prefix}-${String(db.sequence).padStart(5, '0')}`
}

export function stableHash(value: unknown) {
  const text = JSON.stringify(value)
  let hash = 5381
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0
  return hash.toString(16).padStart(8, '0')
}

export async function hashPassword(salt: string, password: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function publicUser(user: UserRecord) {
  const { passwordHash: _hash, salt: _salt, ...rest } = user
  return rest
}

export function findProduct(db: Db, id: string) {
  return db.products.find((nft) => nft.id === id)
}

export function editionAvailability(nft: Nft, edition: string) {
  return nft.editions.find((row) => row.label === edition)?.available ?? 0
}

export function cartFor(db: Db, ownerKey: string): StoredCart {
  db.carts[ownerKey] ??= { lines: [], version: 1 }
  return db.carts[ownerKey]
}

export function quoteFor(db: Db, cart: StoredCart): Quote {
  const priced = cart.lines.map((line) => {
    const nft = findProduct(db, line.nftId)
    return { line, price: nft?.price ?? '0', version: nft?.version ?? 0, available: nft ? editionAvailability(nft, line.edition) : 0 }
  })
  const subtotal = addEth('0', ...priced.map(({ line, price }) => multiplyEth(price, line.quantity)))
  const coupon = cart.coupon ? coupons[cart.coupon] : undefined
  const discount = coupon && !coupon.expired ? percentageEth(subtotal, coupon.basisPoints) : '0.00'
  const networkFee = cart.lines.length ? NETWORK_FEE : '0.00'
  const messages = priced
    .filter(({ line, available }) => line.quantity > available)
    .map(({ line }) => `${findProduct(db, line.nftId)?.name ?? line.nftId}: quantidade acima da disponibilidade da edição ${line.edition}.`)
  if (cart.coupon && coupon?.expired) messages.push('O cupom aplicado expirou.')
  const total = addEth(subtractEth(subtotal, discount), networkFee)
  const id = stableHash({ lines: priced.map(({ line, price, version }) => [line.nftId, line.edition, line.quantity, price, version]), coupon: cart.coupon, discount, networkFee })
  return { id: `quote-${id}`, subtotal, discount, networkFee, total, coupon: cart.coupon, valid: messages.length === 0, messages }
}

export function cartView(db: Db, ownerKey: string): Cart {
  const cart = cartFor(db, ownerKey)
  const lines: CartLine[] = cart.lines.flatMap((line) => {
    const nft = findProduct(db, line.nftId)
    if (!nft) return []
    return [{
      ...line,
      nft: { name: nft.name, token: nft.token, image: nft.image, price: nft.price, network: nft.network, version: nft.version },
      available: editionAvailability(nft, line.edition),
      lineTotal: multiplyEth(nft.price, line.quantity),
    }]
  })
  return { owner: ownerKey.startsWith('user:') ? 'user' : 'guest', lines, coupon: cart.coupon, version: cart.version, quote: quoteFor(db, cart) }
}

/** Soma o carrinho do visitante ao do usuário, respeitando a disponibilidade. */
export function mergeCarts(db: Db, from: string, into: string) {
  const source = db.carts[from]
  if (!source?.lines.length) return
  const target = cartFor(db, into)
  for (const line of source.lines) {
    const nft = findProduct(db, line.nftId)
    if (!nft) continue
    const limit = editionAvailability(nft, line.edition)
    const existing = target.lines.find((row) => row.id === line.id)
    if (existing) existing.quantity = Math.min(limit, existing.quantity + line.quantity)
    else if (limit > 0) target.lines.push({ ...line, quantity: Math.min(limit, line.quantity) })
  }
  target.coupon ??= source.coupon
  target.version += 1
  delete db.carts[from]
}

export function updateProduct(db: Db, id: string, patch: { price?: string; editions?: Array<{ label: string; available: number }> }) {
  const nft = findProduct(db, id)
  if (!nft) return undefined
  const previousPrice = nft.price
  if (patch.price && compareEth(patch.price, nft.price) !== 0) nft.price = patch.price
  for (const change of patch.editions ?? []) {
    const edition = nft.editions.find((row) => row.label === change.label)
    if (edition) edition.available = Math.max(0, change.available)
  }
  nft.available = nft.editions.reduce((total, edition) => total + edition.available, 0)
  nft.version += 1
  return { nft, previousPrice }
}
