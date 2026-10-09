export type Network = 'Ethereum' | 'Polygon' | 'Solana'

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
  available: number
  edition: string
  description: string
  version: number
}

export type CartItem = { nftId: string; quantity: number; edition: string }
export type Cart = { items: CartItem[]; coupon?: string; version: number }
export type User = {
  id: string
  name: string
  email: string
  avatar?: string
  username?: string
  ens?: string
  walletAlias?: string
}
export type Wallet = { id: string; label: string; address: string; network: Network; primary: boolean }
export type Quote = { subtotal: string; discount: string; networkFee: string; total: string; valid: boolean; messages: string[] }
export type Order = { id: string; status: 'pending' | 'confirmed' | 'declined'; items: CartItem[]; quote: Quote; transactionId: string; createdAt: string }

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
export function multiplyEth(value: string, quantity: number) { return ethString(ethUnits(value) * BigInt(quantity)) }
export function percentageEth(value: string, basisPoints: number) {
  const raw = (ethUnits(value) * BigInt(basisPoints) + 5_000n) / 10_000n
  return ethString(((raw + ETH_CENT / 2n) / ETH_CENT) * ETH_CENT)
}

const featuredProducts: Nft[] = [
  { id: 'emerald-042', name: 'Emerald Ape', token: '#042', collection: 'Kurio Apes', image: 'ape-green.png', price: '1.19', category: 'Arte digital', network: 'Ethereum', available: 1, edition: '1/1', description: 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.', version: 1 },
  { id: 'sage-009', name: 'Sage Nomad', token: '#009', collection: 'Kurio Apes', image: 'ape-purple.png', price: '1.69', category: 'Arte digital', network: 'Ethereum', available: 10, edition: '1/10', description: 'Uma peça de edição limitada para colecionadores que buscam narrativas digitais singulares.', version: 1 },
  { id: 'neon-552', name: 'Neon Vessel', token: '#552', collection: 'Kurio Apes', image: 'ape-gold.png', price: '1.99', previousPrice: '2.29', category: 'Fotografia', network: 'Polygon', available: 5, edition: '1/50', description: 'Arte digital selecionada com procedência verificável e metadados preservados.', version: 1 },
  { id: 'cosmic-118', name: 'Cosmic Bloom', token: '#118', collection: 'Kurio Apes', image: 'ape-purple.png', price: '1.29', category: 'Música', network: 'Ethereum', available: 2, edition: '1/10', description: 'Edição colecionável de uma série que explora movimento e luz no universo digital.', version: 1 },
  { id: 'violet-314', name: 'Violet Nomad', token: '#314', collection: 'Kurio Apes', image: 'ape-purple.png', price: '1.39', category: 'Arte 3D', network: 'Solana', available: 4, edition: 'Aberta', description: 'Obra digital com atributos colecionáveis e acesso à comunidade Kurio.', version: 1 },
  { id: 'ivory-088', name: 'Ivory Baron', token: '#088', collection: 'Kurio Apes', image: 'ape-gold.png', price: '1.79', category: 'Colecionáveis', network: 'Ethereum', available: 3, edition: '1/50', description: 'Uma composição digital rara da coleção Kurio Apes.', version: 1 },
  { id: 'golden-207', name: 'Golden Beat', token: '#207', collection: 'Kurio Apes', image: 'ape-dark.png', price: '0.99', category: 'Generativa', network: 'Polygon', available: 8, edition: 'Aberta', description: 'Ritmo, cor e colecionismo em uma edição digital limitada.', version: 1 },
  { id: 'golden-160', name: 'Golden Signal', token: '#160', collection: 'Kurio Apes', image: 'ape-dark.png', price: '0.39', category: 'Jogos', network: 'Solana', available: 12, edition: 'Aberta', description: 'Um sinal único para quem coleciona cultura digital.', version: 1 },
  { id: 'golden-195', name: 'Golden Echo', token: '#195', collection: 'Kurio Apes', image: 'ape-dark.png', price: '0.59', category: 'Utilidade', network: 'Ethereum', available: 7, edition: 'Aberta', description: 'Uma edição luminosa criada para colecionadores da comunidade Kurio.', version: 1 },
]

const generatedCategories: Array<[string, number]> = [
  ['Arte digital', 12], ['Fotografia', 11], ['Música', 10], ['Arte 3D', 9],
  ['Colecionáveis', 12], ['Generativa', 8], ['Jogos', 7], ['Assinaturas', 11], ['Utilidade', 11],
]
const generatedNetworks: Network[] = [
  ...Array<Network>(47).fill('Ethereum'),
  ...Array<Network>(26).fill('Polygon'),
  ...Array<Network>(18).fill('Solana'),
]
const generatedImages = ['ape-green.png', 'ape-purple.png', 'ape-gold.png', 'ape-dark.png']
const generatedProducts: Nft[] = []
let generatedIndex = 0
for (const [category, amount] of generatedCategories) {
  for (let offset = 0; offset < amount; offset += 1) {
    const index = generatedIndex
    const price = ((12 + ((index * 37) % 753)) / 100).toFixed(2)
    generatedProducts.push({
      id: `kurio-edition-${String(index + 10).padStart(3, '0')}`,
      name: `${category} ${String(index + 1).padStart(2, '0')}`,
      token: `#${String(index + 10).padStart(3, '0')}`,
      collection: 'Kurio Editions',
      image: generatedImages[index % generatedImages.length],
      price,
      previousPrice: index % 7 === 0 ? (Number(price) + 0.24).toFixed(2) : undefined,
      category,
      network: generatedNetworks[index],
      available: 1 + (index % 12),
      edition: index % 3 === 0 ? '1/1' : index % 3 === 1 ? '1/10' : 'Aberta',
      description: `Obra da série ${category} criada para o catálogo experimental da Kurio Editions.`,
      version: 1,
    })
    generatedIndex += 1
  }
}

export const products: Nft[] = [...featuredProducts, ...generatedProducts]

export const eth = (value: string) => `${ethString(ethUnits(value))} ETH`
