import type { Edition, Network, Nft, Wallet } from '../domain'

/** Fixtures determinísticas da API simulada. Nunca são importadas pela interface. */

type Seed = Omit<Nft, 'available' | 'editions' | 'version'> & { editions: Array<[label: string, available: number]> }

const editions = (id: string, rows: Array<[string, number]>): Edition[] =>
  rows.map(([label, available]) => ({ id: `${id}:${label}`, label, available }))

const featured: Seed[] = [
  { id: 'emerald-042', name: 'Emerald Ape', token: '#042', collection: 'Kurio Apes', image: 'ape-green.webp', price: '1.19', category: 'Arte digital', network: 'Ethereum', edition: '1/1', editions: [['1/1', 1], ['1/10', 0], ['1/50', 0], ['Aberta', 0]], description: 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.' },
  { id: 'sage-009', name: 'Sage Nomad', token: '#009', collection: 'Kurio Apes', image: 'ape-purple.webp', price: '1.69', category: 'Arte digital', network: 'Ethereum', edition: '1/10', editions: [['1/1', 0], ['1/10', 10], ['1/50', 6], ['Aberta', 12]], description: 'Uma peça de edição limitada para colecionadores que buscam narrativas digitais singulares.' },
  { id: 'neon-552', name: 'Neon Vessel', token: '#552', collection: 'Kurio Apes', image: 'ape-gold.webp', price: '1.99', previousPrice: '2.29', category: 'Fotografia', network: 'Polygon', edition: '1/50', editions: [['1/1', 0], ['1/10', 0], ['1/50', 5], ['Aberta', 3]], description: 'Arte digital selecionada com procedência verificável e metadados preservados.' },
  { id: 'cosmic-118', name: 'Cosmic Bloom', token: '#118', collection: 'Kurio Apes', image: 'ape-purple.webp', price: '1.29', category: 'Música', network: 'Ethereum', edition: '1/10', editions: [['1/1', 0], ['1/10', 2], ['1/50', 0], ['Aberta', 4]], description: 'Edição colecionável de uma série que explora movimento e luz no universo digital.' },
  { id: 'violet-314', name: 'Violet Nomad', token: '#314', collection: 'Kurio Apes', image: 'ape-purple.webp', price: '1.39', category: 'Arte 3D', network: 'Solana', edition: 'Aberta', editions: [['1/1', 0], ['1/10', 1], ['1/50', 2], ['Aberta', 4]], description: 'Obra digital com atributos colecionáveis e acesso à comunidade Kurio.' },
  { id: 'ivory-088', name: 'Ivory Baron', token: '#088', collection: 'Kurio Apes', image: 'ape-gold.webp', price: '1.79', category: 'Colecionáveis', network: 'Ethereum', edition: '1/50', editions: [['1/1', 0], ['1/10', 1], ['1/50', 3], ['Aberta', 5]], description: 'Uma composição digital rara da coleção Kurio Apes.' },
  { id: 'golden-207', name: 'Golden Beat', token: '#207', collection: 'Kurio Apes', image: 'ape-dark.webp', price: '0.99', category: 'Generativa', network: 'Polygon', edition: 'Aberta', editions: [['1/1', 0], ['1/10', 2], ['1/50', 4], ['Aberta', 8]], description: 'Ritmo, cor e colecionismo em uma edição digital limitada.' },
  { id: 'golden-160', name: 'Golden Signal', token: '#160', collection: 'Kurio Apes', image: 'ape-dark.webp', price: '0.39', category: 'Jogos', network: 'Solana', edition: 'Aberta', editions: [['1/1', 1], ['1/10', 3], ['1/50', 6], ['Aberta', 12]], description: 'Um sinal único para quem coleciona cultura digital.' },
  { id: 'golden-195', name: 'Golden Echo', token: '#195', collection: 'Kurio Apes', image: 'ape-dark.webp', price: '0.59', category: 'Utilidade', network: 'Ethereum', edition: 'Aberta', editions: [['1/1', 0], ['1/10', 0], ['1/50', 0], ['Aberta', 0]], description: 'Uma edição luminosa criada para colecionadores da comunidade Kurio. Esgotada no momento.' },
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
const generatedImages = ['ape-green.webp', 'ape-purple.webp', 'ape-gold.webp', 'ape-dark.webp']

function generated(): Seed[] {
  const rows: Seed[] = []
  let index = 0
  for (const [category, amount] of generatedCategories) {
    for (let offset = 0; offset < amount; offset += 1) {
      const price = ((12 + ((index * 37) % 753)) / 100).toFixed(2)
      const base = 1 + (index % 12)
      const editionLabel = index % 3 === 0 ? '1/1' : index % 3 === 1 ? '1/10' : 'Aberta'
      rows.push({
        id: `kurio-edition-${String(index + 10).padStart(3, '0')}`,
        name: `${category} ${String(index + 1).padStart(2, '0')}`,
        token: `#${String(index + 10).padStart(3, '0')}`,
        collection: 'Kurio Editions',
        image: generatedImages[index % generatedImages.length],
        price,
        previousPrice: index % 7 === 0 ? (Number(price) + 0.24).toFixed(2) : undefined,
        category,
        network: generatedNetworks[index],
        edition: editionLabel,
        editions: [['1/1', editionLabel === '1/1' ? 1 : 0], ['1/10', editionLabel === '1/10' ? base : 1], ['1/50', 2], ['Aberta', editionLabel === 'Aberta' ? base : 3]],
        description: `Obra da série ${category} criada para o catálogo experimental da Kurio Editions.`,
      })
      index += 1
    }
  }
  return rows
}

export function seedProducts(): Nft[] {
  return [...featured, ...generated()].map((seed) => {
    const rows = editions(seed.id, seed.editions)
    return { ...seed, editions: rows, available: rows.reduce((total, edition) => total + edition.available, 0), version: 1 }
  })
}

export type UserRecord = {
  id: string
  name: string
  email: string
  username?: string
  avatar?: string
  ens?: string
  walletAlias?: string
  /** SHA-256(salt + ':' + senha). Senhas nunca são persistidas em claro. */
  passwordHash: string
  salt: string
}

/** Credenciais fictícias: demo@kurio.test / 123456 e ana@kurio.test / colecao123. */
export const seedUsers: UserRecord[] = [
  { id: 'user-demo', name: 'Colecionador Demo', email: 'demo@kurio.test', username: 'colecionador.demo', walletAlias: 'Carteira principal', salt: 'kurio-demo-salt', passwordHash: 'a90f9f8f6b2a53b05cc3a0f832d790de3f34c974b8ee74e08f0272f058ab9461' },
  { id: 'user-ana', name: 'Ana Ribeiro', email: 'ana@kurio.test', username: 'ana.ribeiro', walletAlias: 'Cofre Ana', salt: 'kurio-ana-salt', passwordHash: 'fc80685ad2c0f083c46d074521ac0f9c83e0cd5a0ca0e8393aa29d3f278746c4' },
]

export const seedWallets: Record<string, Wallet[]> = {
  'user-demo': [
    { id: 'wallet-demo-1', label: 'Carteira principal', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'Ethereum', primary: true, walletType: 'MetaMask', connected: false },
    { id: 'wallet-demo-2', label: 'Carteira Polygon', address: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72', network: 'Polygon', primary: false, walletType: 'WalletConnect', connected: false },
  ],
  'user-ana': [
    { id: 'wallet-ana-1', label: 'Cofre Ana', address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB', network: 'Ethereum', primary: true, walletType: 'Coinbase Wallet', connected: false },
  ],
}

export const seedFavorites: Record<string, string[]> = { 'user-demo': ['sage-009'], 'user-ana': ['neon-552', 'violet-314'] }

export const coupons: Record<string, { basisPoints: number; expired?: boolean }> = {
  KURIO10: { basisPoints: 1_000 },
  EXPIRADO: { basisPoints: 1_500, expired: true },
}

export const NETWORK_FEE = '0.12'
export const SESSION_TTL_MS = 30 * 60 * 1_000
