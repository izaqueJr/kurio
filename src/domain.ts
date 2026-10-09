/**
 * Contratos compartilhados entre transporte (REST/Socket.IO), cache e interface.
 * Valores monetários trafegam sempre como strings decimais em ETH.
 */
export type Network = 'Ethereum' | 'Polygon' | 'Solana'
export const NETWORKS: Network[] = ['Ethereum', 'Polygon', 'Solana']

export type Edition = { id: string; label: string; available: number }

export type Nft = {
  id: string
  name: string
  token: string
  collection: string
  image: string
  price: string
  previousPrice?: string
  category: string
  network: Network
  /** Soma das edições disponíveis. */
  available: number
  edition: string
  editions: Edition[]
  description: string
  version: number
}

export type NftListParams = {
  q?: string
  category?: string
  network?: Network
  sort?: 'recent' | 'price-asc' | 'price-desc'
  min?: number
  max?: number
  page?: number
  pageSize?: number
  collection?: string
  ids?: string[]
  exclude?: string
}

export type NftListResponse = {
  items: Nft[]
  total: number
  page: number
  pageSize: number
  facets: {
    categories: Record<string, number>
    networks: Record<string, number>
    priceRange: { min: number; max: number }
  }
}

export type User = {
  id: string
  name: string
  email: string
  avatar?: string
  username?: string
  ens?: string
  walletAlias?: string
}

export type SessionResponse = { user: User; token: string; expiresAt: string }

export type Quote = {
  /** Identifica de forma determinística o conteúdo da cotação (itens, preços, cupom e taxas). */
  id: string
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon?: string
  valid: boolean
  messages: string[]
}

export type CartLine = {
  id: string
  nftId: string
  edition: string
  quantity: number
  nft: Pick<Nft, 'name' | 'token' | 'image' | 'price' | 'network' | 'version'>
  /** Disponibilidade atual da edição escolhida. */
  available: number
  lineTotal: string
}

export type Cart = {
  owner: 'guest' | 'user'
  lines: CartLine[]
  coupon?: string
  version: number
  quote: Quote
}

export type Wallet = {
  id: string
  label: string
  address: string
  network: Network
  primary: boolean
  walletType: string
  displayName?: string
  profileName?: string
  email?: string
  ens?: string
  referralCode?: string
  secondaryAddress?: string
  connected: boolean
}

export type WalletInput = Omit<Wallet, 'id' | 'primary' | 'connected'> & { primary?: boolean }

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export type OrderItem = {
  nftId: string
  name: string
  token: string
  image: string
  edition: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

export type Order = {
  id: string
  status: OrderStatus
  version: number
  items: OrderItem[]
  quote: Quote
  network: Network
  wallet: { id: string; label: string; address: string; walletType: string }
  transactionHash: string
  idempotencyKey: string
  createdAt: string
  settledAt?: string
  failureReason?: string
}

export type CreateOrderInput = {
  idempotencyKey: string
  quoteId: string
  cartVersion: number
  network: Network
  walletId: string
  buyer: { name: string; email: string; username: string; profileName: string; ens?: string; note?: string }
}

export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'AVAILABILITY_CONFLICT'
  | 'QUOTE_CHANGED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'WALLET_REJECTED'
  | 'WALLET_NOT_CONNECTED'
  | 'TRANSIENT'

export type ApiErrorBody = {
  code: ApiErrorCode
  message: string
  fields?: Record<string, string>
  /** Cotação atualizada quando `code` é `QUOTE_CHANGED`. */
  quote?: Quote
}

/** Envelope comum dos eventos em tempo real. */
export type RealtimeEvent<TType extends string, TData> = {
  eventId: string
  type: TType
  resource: { type: 'nft' | 'order'; id: string }
  version: number
  occurredAt: string
  data: TData
}
export type NftUpdatedEvent = RealtimeEvent<'nft.updated', { price: string; available: number; editions: Edition[]; previousPrice: string }>
export type OrderUpdatedEvent = RealtimeEvent<'order.updated', { status: OrderStatus; failureReason?: string }>

const ETH_SCALE = 18n
const ETH_FACTOR = 10n ** ETH_SCALE
const ETH_CENT = 10n ** 16n

function ethUnits(value: string): bigint {
  const normalized = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new Error(`Valor ETH inválido: ${value}`)
  const negative = normalized.startsWith('-')
  const [wholePart, fractionPart = ''] = (negative ? normalized.slice(1) : normalized).split('.')
  const fraction = `${fractionPart.slice(0, Number(ETH_SCALE))}${'0'.repeat(Math.max(0, Number(ETH_SCALE) - fractionPart.length))}`
  const units = BigInt(wholePart) * ETH_FACTOR + BigInt(fraction || '0')
  return negative ? -units : units
}

function ethString(units: bigint, minimumFraction = 2): string {
  const negative = units < 0n
  const absolute = negative ? -units : units
  const whole = absolute / ETH_FACTOR
  const fraction = (absolute % ETH_FACTOR).toString().padStart(Number(ETH_SCALE), '0').replace(/0+$/, '')
  const renderedFraction = fraction.padEnd(Math.min(minimumFraction, Number(ETH_SCALE)), '0')
  return `${negative ? '-' : ''}${whole}${renderedFraction ? `.${renderedFraction}` : ''}`
}

export function addEth(...values: string[]) { return ethString(values.reduce((total, value) => total + ethUnits(value), 0n)) }
export function subtractEth(value: string, deduction: string) { return ethString(ethUnits(value) - ethUnits(deduction)) }
export function multiplyEth(value: string, quantity: number) {
  if (!Number.isInteger(quantity)) throw new Error('Quantidades devem ser inteiras.')
  return ethString(ethUnits(value) * BigInt(quantity))
}
export function percentageEth(value: string, basisPoints: number) {
  const raw = (ethUnits(value) * BigInt(basisPoints) + 5_000n) / 10_000n
  return ethString(((raw + ETH_CENT / 2n) / ETH_CENT) * ETH_CENT)
}
export function compareEth(left: string, right: string) {
  const difference = ethUnits(left) - ethUnits(right)
  return difference === 0n ? 0 : difference > 0n ? 1 : -1
}

export const eth = (value: string) => `${ethString(ethUnits(value))} ETH`

export const ADDRESS_PATTERNS: Record<Network, RegExp> = {
  Ethereum: /^0x[a-fA-F0-9]{40}$/,
  Polygon: /^0x[a-fA-F0-9]{40}$/,
  Solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
}

export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
}
