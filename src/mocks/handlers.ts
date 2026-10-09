import { delay, http, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import {
  ADDRESS_PATTERNS,
  NETWORKS,
  multiplyEth,
  type ApiErrorBody,
  type ApiErrorCode,
  type CreateOrderInput,
  type Network,
  type Nft,
  type NftListResponse,
  type SessionResponse,
  type Wallet,
  type WalletInput,
} from '../domain'
import {
  cartFor,
  cartView,
  editionAvailability,
  findProduct,
  hashPassword,
  mergeCarts,
  nextId,
  publicUser,
  quoteFor,
  readDb,
  stableHash,
  updateProduct,
  writeDb,
  type Db,
  type StoredOrder,
} from './db'
import { coupons, SESSION_TTL_MS } from './fixtures'
import { scheduleSettlement, settleDueOrders } from './orders'
import { emitNftUpdated, realtimeHandler } from './realtime-server'
import { CLIENT_TIMEOUT_MS, getScenario, latency, SETTLE_DELAY_MS } from './scenarios'

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  AVAILABILITY_CONFLICT: 409,
  QUOTE_CHANGED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  WALLET_REJECTED: 403,
  WALLET_NOT_CONNECTED: 409,
  TRANSIENT: 503,
}

function fail(code: ApiErrorCode, message: string, extra: Partial<ApiErrorBody> = {}, status = STATUS[code]) {
  return HttpResponse.json<ApiErrorBody>({ code, message, ...extra }, { status })
}

type Viewer = { db: Db; userId?: string; ownerKey: string; expired: boolean }

function viewer(request: Request): Viewer {
  const db = readDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const guestId = request.headers.get('x-guest-id') ?? 'anonymous'
  const session = token ? db.sessions.find((row) => row.token === token) : undefined
  const expired = Boolean(token) && (!session || session.expiresAt <= Date.now() || getScenario() === 'session-expired')
  const userId = session && !expired ? session.userId : undefined
  if (session && userId) session.expiresAt = Date.now() + SESSION_TTL_MS
  return { db, userId, ownerKey: userId ? `user:${userId}` : `guest:${guestId}`, expired }
}

function unauthenticated(current: Viewer) {
  return current.expired
    ? fail('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
    : fail('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
}

/** Envolve handlers privados: exige sessão válida e transforma exceções em falha transitória. */
function authenticated<P extends PathParams>(
  resolver: (args: Parameters<HttpResponseResolver<P, DefaultBodyType>>[0], current: Viewer & { userId: string }) => ReturnType<HttpResponseResolver<P, DefaultBodyType>>,
): HttpResponseResolver<P, DefaultBodyType> {
  return async (args) => {
    if (getScenario() === 'offline') return HttpResponse.error()
    await latency('default')
    const current = viewer(args.request)
    if (!current.userId) return unauthenticated(current)
    return resolver(args, current as Viewer & { userId: string })
  }
}

function publicHandler<P extends PathParams>(
  kind: 'catalog' | 'detail' | 'default',
  resolver: (args: Parameters<HttpResponseResolver<P, DefaultBodyType>>[0], current: Viewer) => ReturnType<HttpResponseResolver<P, DefaultBodyType>>,
): HttpResponseResolver<P, DefaultBodyType> {
  return async (args) => {
    if (getScenario() === 'offline') return HttpResponse.error()
    await latency(kind, new URL(args.request.url))
    const current = viewer(args.request)
    if (current.expired && kind === 'default') return unauthenticated(current)
    return resolver(args, current)
  }
}

async function body<T>(request: Request): Promise<Partial<T>> {
  try { return (await request.json()) as Partial<T> } catch { return {} }
}

function startSession(db: Db, userId: string): SessionResponse {
  const token = `session-${crypto.randomUUID()}`
  const expiresAt = Date.now() + SESSION_TTL_MS
  db.sessions = db.sessions.filter((row) => row.expiresAt > Date.now())
  db.sessions.push({ token, userId, expiresAt })
  const user = db.users.find((row) => row.id === userId)!
  return { user: publicUser(user), token, expiresAt: new Date(expiresAt).toISOString() }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function catalogFilter(url: URL, products: Nft[]) {
  const q = url.searchParams.get('q')?.toLowerCase().trim() ?? ''
  const category = url.searchParams.get('category')
  const network = url.searchParams.get('network')
  const collection = url.searchParams.get('collection')
  const exclude = url.searchParams.get('exclude')
  const ids = url.searchParams.getAll('ids').flatMap((value) => value.split(',')).filter(Boolean)
  const minimum = Number(url.searchParams.get('min') ?? '0')
  const maximum = Number(url.searchParams.get('max') ?? '999999')
  const base = (nft: Nft) =>
    (!q || `${nft.name} ${nft.token} ${nft.collection}`.toLowerCase().includes(q)) &&
    Number(nft.price) >= minimum && Number(nft.price) <= maximum &&
    (!collection || nft.collection === collection) &&
    (!exclude || nft.id !== exclude) &&
    (!ids.length || ids.includes(nft.id))
  const byCategory = (nft: Nft) => !category || category === 'Todos os NFTs' || nft.category === category
  const byNetwork = (nft: Nft) => !network || nft.network === network
  return { base, byCategory, byNetwork, ids }
}

export const handlers = [
  // ---------- Sessão e conta ----------
  http.post('/api/account', async ({ request }) => {
    if (getScenario() === 'offline') return HttpResponse.error()
    await latency('default')
    const data = await body<{ name: string; email: string; password: string }>(request)
    const fields: Record<string, string> = {}
    if (!data.name?.trim()) fields.name = 'Informe seu nome de usuário.'
    if (!data.email || !EMAIL.test(data.email)) fields.email = 'Informe um e-mail válido.'
    if (!data.password || data.password.length < 6) fields.password = 'A senha precisa de pelo menos 6 caracteres.'
    if (Object.keys(fields).length) return fail('VALIDATION', 'Revise os campos informados.', { fields })
    const db = readDb()
    if (db.users.some((user) => user.email.toLowerCase() === data.email!.toLowerCase())) {
      return fail('CONFLICT', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado.' } })
    }
    const salt = crypto.randomUUID()
    const id = nextId(db, 'user')
    db.users.push({ id, name: data.name!.trim(), email: data.email!.toLowerCase(), username: data.name!.trim().toLowerCase().replace(/\s+/g, '.'), salt, passwordHash: await hashPassword(salt, data.password!) })
    db.wallets[id] = []
    db.favorites[id] = []
    const session = startSession(db, id)
    mergeCarts(db, viewer(request).ownerKey, `user:${id}`)
    writeDb(db)
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post('/api/session/login', async ({ request }) => {
    if (getScenario() === 'offline') return HttpResponse.error()
    await latency('default')
    const data = await body<{ email: string; password: string }>(request)
    const fields: Record<string, string> = {}
    if (!data.email || !EMAIL.test(data.email)) fields.email = 'Informe um e-mail válido.'
    if (!data.password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) return fail('VALIDATION', 'Revise os campos informados.', { fields })
    const db = readDb()
    const user = db.users.find((row) => row.email.toLowerCase() === data.email!.toLowerCase())
    if (!user || (await hashPassword(user.salt, data.password!)) !== user.passwordHash) {
      return fail('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
    }
    const guestKey = viewer(request).ownerKey
    const session = startSession(db, user.id)
    if (guestKey.startsWith('guest:')) mergeCarts(db, guestKey, `user:${user.id}`)
    writeDb(db)
    return HttpResponse.json(session)
  }),

  http.get('/api/session', authenticated((_args, { db, userId }) => {
    writeDb(db)
    return HttpResponse.json(publicUser(db.users.find((user) => user.id === userId)!))
  })),

  http.post('/api/session/logout', async ({ request }) => {
    await delay(60)
    const db = readDb()
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    db.sessions = db.sessions.filter((row) => row.token !== token)
    writeDb(db)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------- Catálogo ----------
  http.get('/api/nfts', publicHandler('catalog', ({ request }, { db }) => {
    const scenario = getScenario()
    if (scenario === 'server-error') return fail('TRANSIENT', 'O catálogo está temporariamente indisponível.', {}, 500)
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(30, Math.max(1, Number(url.searchParams.get('pageSize') ?? 9)))
    const sort = url.searchParams.get('sort') ?? 'recent'
    const { base, byCategory, byNetwork, ids } = catalogFilter(url, db.products)
    let rows = db.products.filter((nft) => base(nft) && byCategory(nft) && byNetwork(nft))
    if (ids.length) rows = ids.map((id) => rows.find((nft) => nft.id === id)).filter((nft): nft is Nft => Boolean(nft))
    if (sort === 'price-asc') rows = [...rows].sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price-desc') rows = [...rows].sort((a, b) => Number(b.price) - Number(a.price))
    if (scenario === 'empty') rows = []
    const prices = db.products.map((nft) => Number(nft.price))
    const facetRows = db.products.filter(base)
    const response: NftListResponse = {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
      facets: {
        categories: Object.fromEntries([...new Set(db.products.map((nft) => nft.category))].map((name) => [name, facetRows.filter((nft) => byNetwork(nft) && nft.category === name).length])),
        networks: Object.fromEntries(NETWORKS.map((name) => [name, facetRows.filter((nft) => byCategory(nft) && nft.network === name).length])),
        priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
      },
    }
    return HttpResponse.json(response)
  })),

  http.get('/api/nfts/:id', publicHandler('detail', ({ params }, { db }) => {
    if (getScenario() === 'server-error') return fail('TRANSIENT', 'Não foi possível carregar este NFT agora.', {}, 500)
    const nft = findProduct(db, String(params.id))
    return nft ? HttpResponse.json(nft) : fail('NOT_FOUND', 'NFT não encontrado.')
  })),

  // ---------- Favoritos ----------
  http.get('/api/favorites', authenticated((_args, { db, userId }) => HttpResponse.json(db.favorites[userId] ?? []))),
  http.put('/api/favorites/:id', authenticated(({ params }, { db, userId }) => {
    if (getScenario() === 'favorites-fail') return fail('TRANSIENT', 'Não foi possível salvar o favorito. Tente novamente.')
    const id = String(params.id)
    if (!findProduct(db, id)) return fail('NOT_FOUND', 'NFT não encontrado.')
    const favorites = (db.favorites[userId] ??= [])
    if (!favorites.includes(id)) favorites.push(id)
    writeDb(db)
    return HttpResponse.json(favorites)
  })),
  http.delete('/api/favorites/:id', authenticated(({ params }, { db, userId }) => {
    if (getScenario() === 'favorites-fail') return fail('TRANSIENT', 'Não foi possível remover o favorito. Tente novamente.')
    db.favorites[userId] = (db.favorites[userId] ?? []).filter((id) => id !== params.id)
    writeDb(db)
    return HttpResponse.json(db.favorites[userId])
  })),

  // ---------- Carrinho ----------
  http.get('/api/cart', publicHandler('default', (_args, { db, ownerKey }) => HttpResponse.json(cartView(db, ownerKey)))),

  http.post('/api/cart/items', publicHandler('default', async ({ request }, { db, ownerKey }) => {
    const data = await body<{ nftId: string; edition: string; quantity: number }>(request)
    const nft = data.nftId ? findProduct(db, data.nftId) : undefined
    if (!nft) return fail('NOT_FOUND', 'NFT não encontrado.')
    const edition = data.edition ?? nft.edition
    const quantity = Number(data.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) return fail('VALIDATION', 'A quantidade deve ser um número inteiro positivo.', { fields: { quantity: 'Quantidade inválida.' } })
    const available = editionAvailability(nft, edition)
    const cart = cartFor(db, ownerKey)
    const id = `${nft.id}:${edition}`
    const existing = cart.lines.find((line) => line.id === id)
    const next = (existing?.quantity ?? 0) + quantity
    if (available === 0) return fail('AVAILABILITY_CONFLICT', `A edição ${edition} está esgotada.`)
    if (next > available) return fail('AVAILABILITY_CONFLICT', `Restam apenas ${available} unidade(s) da edição ${edition}.`)
    if (existing) existing.quantity = next
    else cart.lines.push({ id, nftId: nft.id, edition, quantity })
    cart.version += 1
    writeDb(db)
    return HttpResponse.json(cartView(db, ownerKey))
  })),

  http.patch('/api/cart/items/:lineId', publicHandler('default', async ({ params, request }, { db, ownerKey }) => {
    const { quantity } = await body<{ quantity: number }>(request)
    const cart = cartFor(db, ownerKey)
    const line = cart.lines.find((row) => row.id === params.lineId)
    if (!line) return fail('NOT_FOUND', 'Item não encontrado no carrinho.')
    const nft = findProduct(db, line.nftId)
    const available = nft ? editionAvailability(nft, line.edition) : 0
    if (!Number.isInteger(quantity) || Number(quantity) < 1) return fail('VALIDATION', 'A quantidade deve ser um número inteiro positivo.')
    if (Number(quantity) > available) return fail('AVAILABILITY_CONFLICT', `Restam apenas ${available} unidade(s) desta edição.`)
    line.quantity = Number(quantity)
    cart.version += 1
    writeDb(db)
    return HttpResponse.json(cartView(db, ownerKey))
  })),

  http.delete('/api/cart/items/:lineId', publicHandler('default', ({ params }, { db, ownerKey }) => {
    const cart = cartFor(db, ownerKey)
    cart.lines = cart.lines.filter((line) => line.id !== params.lineId)
    if (!cart.lines.length) cart.coupon = undefined
    cart.version += 1
    writeDb(db)
    return HttpResponse.json(cartView(db, ownerKey))
  })),

  http.put('/api/cart/coupon', publicHandler('default', async ({ request }, { db, ownerKey }) => {
    const code = String((await body<{ code: string }>(request)).code ?? '').trim().toUpperCase()
    const coupon = coupons[code]
    if (!code) return fail('VALIDATION', 'Informe um código promocional.', { fields: { code: 'Informe um código promocional.' } })
    if (!coupon) return fail('COUPON_INVALID', 'Cupom inválido.', { fields: { code: 'Cupom inválido.' } })
    if (coupon.expired) return fail('COUPON_EXPIRED', 'Cupom expirado.', { fields: { code: 'Cupom expirado.' } })
    const cart = cartFor(db, ownerKey)
    cart.coupon = code
    cart.version += 1
    writeDb(db)
    return HttpResponse.json(cartView(db, ownerKey))
  })),

  http.delete('/api/cart/coupon', publicHandler('default', (_args, { db, ownerKey }) => {
    const cart = cartFor(db, ownerKey)
    cart.coupon = undefined
    cart.version += 1
    writeDb(db)
    return HttpResponse.json(cartView(db, ownerKey))
  })),

  // ---------- Cotação ----------
  http.post('/api/quote', authenticated((_args, { db, userId }) => HttpResponse.json(quoteFor(db, cartFor(db, `user:${userId}`))))),

  // ---------- Pedidos ----------
  http.post('/api/orders', authenticated(async ({ request }, { db, userId }) => {
    const input = await body<CreateOrderInput>(request)
    if (!input.idempotencyKey) return fail('VALIDATION', 'Chave de idempotência obrigatória.')
    const fingerprint = stableHash({ quoteId: input.quoteId, cartVersion: input.cartVersion, network: input.network, walletId: input.walletId })
    const existing = db.orders.find((order) => order.idempotencyKey === input.idempotencyKey && order.userId === userId)
    if (existing) {
      return existing.fingerprint === fingerprint
        ? HttpResponse.json(publicOrder(existing))
        : fail('IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outro conteúdo. Revise o pedido.')
    }
    const fields: Record<string, string> = {}
    const buyer = input.buyer
    if (!buyer?.name?.trim()) fields.name = 'Informe o nome de exibição.'
    if (!buyer?.email || !EMAIL.test(buyer.email)) fields.email = 'Informe um e-mail válido.'
    if (!buyer?.username?.trim()) fields.username = 'Informe o nome de usuário.'
    if (!buyer?.profileName?.trim()) fields.profileName = 'Informe o nome do perfil.'
    if (!input.network || !NETWORKS.includes(input.network)) fields.network = 'Selecione uma rede.'
    if (Object.keys(fields).length) return fail('VALIDATION', 'Revise os dados do colecionador.', { fields })
    const wallet = (db.wallets[userId] ?? []).find((row) => row.id === input.walletId)
    if (!wallet) return fail('VALIDATION', 'Selecione uma carteira cadastrada.', { fields: { walletId: 'Selecione uma carteira cadastrada.' } })
    if (wallet.network !== input.network) return fail('VALIDATION', 'A carteira escolhida não opera nesta rede.', { fields: { walletId: 'A carteira escolhida não opera nesta rede.' } })
    if (!wallet.connected) return fail('WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar a compra.')

    const ownerKey = `user:${userId}`
    const cart = cartFor(db, ownerKey)
    if (!cart.lines.length) return fail('CONFLICT', 'Seu carrinho está vazio.')
    const scenario = getScenario()
    const first = cart.lines[0]
    if (scenario === 'price-changed' || scenario === 'sold-out') {
      const nft = findProduct(db, first.nftId)!
      const result = scenario === 'price-changed'
        ? updateProduct(db, nft.id, { price: (Number(nft.price) + 0.05).toFixed(2) })
        : updateProduct(db, nft.id, { editions: [{ label: first.edition, available: 0 }] })
      writeDb(db)
      if (result) emitNftUpdated(result.nft, result.previousPrice)
    }
    for (const line of cart.lines) {
      const nft = findProduct(db, line.nftId)
      const available = nft ? editionAvailability(nft, line.edition) : 0
      if (line.quantity > available) {
        return fail('AVAILABILITY_CONFLICT', `${nft?.name ?? 'Um item'} (edição ${line.edition}) não tem mais a quantidade solicitada. Revise seu carrinho.`)
      }
    }
    if (cart.coupon && coupons[cart.coupon]?.expired) return fail('COUPON_EXPIRED', 'O cupom aplicado expirou. Remova-o para continuar.')
    const current = quoteFor(db, cart)
    if (input.quoteId !== current.id || input.cartVersion !== cart.version) {
      return fail('QUOTE_CHANGED', 'Os valores do pedido mudaram. Revise o total e confirme novamente.', { quote: current })
    }
    const view = cartView(db, ownerKey)
    const order: StoredOrder = {
      id: nextId(db, 'order'),
      status: 'pending',
      version: 1,
      items: view.lines.map((line) => ({ nftId: line.nftId, name: line.nft.name, token: line.nft.token, image: line.nft.image, edition: line.edition, quantity: line.quantity, unitPrice: line.nft.price, lineTotal: multiplyEth(line.nft.price, line.quantity) })),
      lines: structuredClone(cart.lines),
      quote: current,
      network: input.network as Network,
      wallet: { id: wallet.id, label: wallet.label, address: wallet.address, walletType: wallet.walletType },
      transactionHash: `0x${stableHash(input.idempotencyKey)}${stableHash(fingerprint)}${stableHash(userId)}`.padEnd(66, '0'),
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
      userId,
      fingerprint,
      outcome: scenario === 'payment-declined' ? 'declined' : 'confirmed',
      settleAt: Date.now() + (scenario === 'payment-pending' ? 8_000 : SETTLE_DELAY_MS),
    }
    db.orders.push(order)
    writeDb(db)
    scheduleSettlement(order)
    // Primeira resposta perdida: o pedido existe, mas o cliente só o recupera reenviando a mesma chave.
    if (scenario === 'order-timeout') await delay(CLIENT_TIMEOUT_MS + 1_000)
    return HttpResponse.json(publicOrder(order), { status: 201 })
  })),

  http.get('/api/orders/:id', authenticated(({ params }, { userId }) => {
    settleDueOrders()
    const order = readDb().orders.find((row) => row.id === params.id)
    if (!order) return fail('NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== userId) return fail('FORBIDDEN', 'Este pedido pertence a outra conta.')
    return HttpResponse.json(publicOrder(order))
  })),

  // ---------- Perfil ----------
  http.get('/api/profile', authenticated((_args, { db, userId }) => HttpResponse.json(publicUser(db.users.find((user) => user.id === userId)!)))),
  http.patch('/api/profile', authenticated(async ({ request }, { db, userId }) => {
    const data = await body<{ name: string; email: string; username: string; ens: string; walletAlias: string; avatar: string }>(request)
    const fields: Record<string, string> = {}
    if (!data.name?.trim()) fields.name = 'Informe o nome de exibição.'
    if (!data.username?.trim()) fields.username = 'Informe o nome de usuário.'
    else if (!/^[a-z0-9._-]{3,30}$/i.test(data.username)) fields.username = 'Use de 3 a 30 letras, números, ponto, hífen ou sublinhado.'
    if (!data.email || !EMAIL.test(data.email)) fields.email = 'Informe um e-mail válido.'
    else if (db.users.some((user) => user.id !== userId && user.email.toLowerCase() === data.email!.toLowerCase())) fields.email = 'Este e-mail já pertence a outra conta.'
    if (data.ens && !/^[a-z0-9-]{3,}$/i.test(data.ens)) fields.ens = 'O nome ENS deve ter ao menos 3 caracteres (letras, números ou hífen).'
    if (data.avatar && (!data.avatar.startsWith('data:image/') || data.avatar.length > 1_500_000)) fields.avatar = 'Envie uma imagem de até 1 MB.'
    if (Object.keys(fields).length) return fail('VALIDATION', 'Revise os campos do perfil.', { fields })
    const user = db.users.find((row) => row.id === userId)!
    Object.assign(user, { name: data.name!.trim(), email: data.email!.toLowerCase(), username: data.username, ens: data.ens || undefined, walletAlias: data.walletAlias || undefined, avatar: data.avatar || undefined })
    writeDb(db)
    return HttpResponse.json(publicUser(user))
  })),
  http.post('/api/profile/password', authenticated(async ({ request }, { db, userId }) => {
    const data = await body<{ currentPassword: string; nextPassword: string }>(request)
    const user = db.users.find((row) => row.id === userId)!
    const fields: Record<string, string> = {}
    if (!data.currentPassword) fields.currentPassword = 'Informe a senha atual.'
    else if ((await hashPassword(user.salt, data.currentPassword)) !== user.passwordHash) fields.currentPassword = 'A senha atual está incorreta.'
    if (!data.nextPassword || data.nextPassword.length < 6) fields.nextPassword = 'A nova senha precisa de pelo menos 6 caracteres.'
    else if (data.nextPassword === data.currentPassword) fields.nextPassword = 'A nova senha deve ser diferente da atual.'
    if (Object.keys(fields).length) return fail('VALIDATION', 'Não foi possível alterar a senha.', { fields })
    user.salt = crypto.randomUUID()
    user.passwordHash = await hashPassword(user.salt, data.nextPassword!)
    writeDb(db)
    return new HttpResponse(null, { status: 204 })
  })),

  // ---------- Carteiras ----------
  http.get('/api/wallets', authenticated((_args, { db, userId }) => HttpResponse.json(db.wallets[userId] ?? []))),
  http.post('/api/wallets', authenticated(async ({ request }, { db, userId }) => {
    const data = await body<WalletInput>(request)
    const fields = validateWallet(data)
    if (Object.keys(fields).length) return fail('VALIDATION', 'Revise os dados da carteira.', { fields })
    const wallets = (db.wallets[userId] ??= [])
    if (wallets.some((wallet) => wallet.address.toLowerCase() === data.address!.toLowerCase() && wallet.network === data.network)) {
      return fail('CONFLICT', 'Esta carteira já está cadastrada.', { fields: { address: 'Esta carteira já está cadastrada nesta rede.' } })
    }
    const primary = data.primary || !wallets.length
    if (primary) for (const wallet of wallets) wallet.primary = false
    const wallet: Wallet = { ...sanitizeWallet(data), id: nextId(db, 'wallet'), primary, connected: false }
    wallets.push(wallet)
    writeDb(db)
    return HttpResponse.json(wallet, { status: 201 })
  })),
  http.patch('/api/wallets/:id', authenticated(async ({ params, request }, { db, userId }) => {
    const wallets = db.wallets[userId] ?? []
    const wallet = wallets.find((row) => row.id === params.id)
    if (!wallet) return fail('NOT_FOUND', 'Carteira não encontrada.')
    const data = { ...wallet, ...(await body<WalletInput>(request)) }
    const fields = validateWallet(data)
    if (Object.keys(fields).length) return fail('VALIDATION', 'Revise os dados da carteira.', { fields })
    if (data.primary && !wallet.primary) for (const row of wallets) row.primary = false
    Object.assign(wallet, sanitizeWallet(data), { primary: data.primary ?? wallet.primary })
    if (!wallets.some((row) => row.primary)) wallet.primary = true
    writeDb(db)
    return HttpResponse.json(wallet)
  })),
  http.post('/api/wallets/:id/connect', authenticated(async ({ params }, { db, userId }) => {
    const wallet = (db.wallets[userId] ?? []).find((row) => row.id === params.id)
    if (!wallet) return fail('NOT_FOUND', 'Carteira não encontrada.')
    await delay(400)
    if (getScenario() === 'wallet-reject') return fail('WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    for (const row of db.wallets[userId]) row.connected = row.id === wallet.id
    writeDb(db)
    return HttpResponse.json(wallet)
  })),
  http.post('/api/wallets/:id/disconnect', authenticated(({ params }, { db, userId }) => {
    const wallet = (db.wallets[userId] ?? []).find((row) => row.id === params.id)
    if (!wallet) return fail('NOT_FOUND', 'Carteira não encontrada.')
    wallet.connected = false
    writeDb(db)
    return HttpResponse.json(wallet)
  })),

  realtimeHandler,
]

function publicOrder(order: StoredOrder) {
  const { userId: _user, fingerprint: _fingerprint, settleAt: _settle, outcome: _outcome, lines: _lines, ...rest } = order
  return rest
}

function validateWallet(data: Partial<WalletInput>) {
  const fields: Record<string, string> = {}
  if (!data.label?.trim()) fields.label = 'Informe o apelido da carteira.'
  if (!data.network || !NETWORKS.includes(data.network)) fields.network = 'Selecione uma rede.'
  if (!data.walletType) fields.walletType = 'Selecione o tipo de carteira.'
  if (!data.address?.trim()) fields.address = 'Informe o endereço da carteira.'
  else if (data.network && !ADDRESS_PATTERNS[data.network].test(data.address.trim())) {
    fields.address = data.network === 'Solana' ? 'Endereço Solana inválido (base58, 32 a 44 caracteres).' : 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
  }
  if (data.email && !EMAIL.test(data.email)) fields.email = 'Informe um e-mail válido.'
  return fields
}

function sanitizeWallet(data: Partial<WalletInput>) {
  return {
    label: data.label!.trim(),
    address: data.address!.trim(),
    network: data.network!,
    walletType: data.walletType!,
    displayName: data.displayName?.trim() || undefined,
    profileName: data.profileName?.trim() || undefined,
    email: data.email?.trim() || undefined,
    ens: data.ens?.trim() || undefined,
    referralCode: data.referralCode?.trim() || undefined,
    secondaryAddress: data.secondaryAddress?.trim() || undefined,
  }
}
