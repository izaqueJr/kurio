import { delay, http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { addEth, multiplyEth, percentageEth, products, subtractEth, type CartItem, type Order, type Quote, type User } from '../domain'
import { readStore, writeStore } from './store'

function quote(items: CartItem[], coupon?: string): Quote {
  const subtotal = addEth(...items.map((item) => multiplyEth(products.find((nft) => nft.id === item.nftId)?.price ?? '0', item.quantity)))
  const discount = coupon === 'KURIO10' ? percentageEth(subtotal, 1_000) : '0.00'
  const networkFee = items.length ? '0.12' : '0.00'
  return { subtotal, discount, networkFee, total: addEth(subtractEth(subtotal, discount), networkFee), valid: true, messages: [] }
}
function currentUser() { return readStore().user }
function scenario(request: Request) { return request.headers.get('x-kurio-scenario') ?? 'default' }
async function scenarioDelay(request: Request) {
  const active = scenario(request)
  await delay(active === 'slow' ? 1_200 : active === 'timeout' ? 8_500 : 180)
  return active
}

export const handlers: any[] = [
  http.get('/api/nfts', async ({ request }) => {
    const activeScenario = await scenarioDelay(request)
    if (activeScenario === 'offline') return HttpResponse.json({ message: 'Conexão indisponível.' }, { status: 503 })
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase() ?? ''
    const category = url.searchParams.get('category')
    const network = url.searchParams.get('network')
    const minimum = Number(url.searchParams.get('min') ?? '0')
    const maximum = Number(url.searchParams.get('max') ?? '999999')
    const page = Number(url.searchParams.get('page') ?? 1)
    const sort = url.searchParams.get('sort') ?? 'recent'
    const matchesBase = (nft: typeof products[number]) => (!q || `${nft.name} ${nft.collection}`.toLowerCase().includes(q)) && Number(nft.price) >= minimum && Number(nft.price) <= maximum
    let rows = products.filter((nft) => matchesBase(nft) && (!category || category === 'Todos os NFTs' || nft.category === category) && (!network || nft.network === network))
    if (sort === 'price-asc') rows = [...rows].sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price-desc') rows = [...rows].sort((a, b) => Number(b.price) - Number(a.price))
    const pageSize = 9
    const categoryFacetRows = products.filter((nft) => matchesBase(nft) && (!network || nft.network === network))
    const networkFacetRows = products.filter((nft) => matchesBase(nft) && (!category || category === 'Todos os NFTs' || nft.category === category))
    const prices = products.map((nft) => Number(nft.price))
    const facets = {
      categories: Object.fromEntries([...new Set(products.map((nft) => nft.category))].map((name) => [name, categoryFacetRows.filter((nft) => nft.category === name).length])),
      networks: Object.fromEntries([...new Set(products.map((nft) => nft.network))].map((name) => [name, networkFacetRows.filter((nft) => nft.network === name).length])),
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    }
    if (activeScenario === 'empty') rows = []
    return HttpResponse.json({ items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, facets })
  }),
  http.get('/api/nfts/:id', async ({ params, request }) => {
    await scenarioDelay(request)
    const nft = products.find((item) => item.id === params.id)
    return nft ? HttpResponse.json(nft) : HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
  }),
  http.get('/api/session', ({ request }) => scenario(request) === 'session-expired' || !currentUser() ? HttpResponse.json({ message: 'Sessão expirada.' }, { status: 401 }) : HttpResponse.json(currentUser())),
  http.post('/api/session/login', async ({ request }) => {
    await delay(220); const body = await request.json() as { email: string; password: string }
    if (!body.email.includes('@') || body.password.length < 6) return HttpResponse.json({ message: 'E-mail ou senha inválidos.' }, { status: 422 })
    const store = readStore(); store.user = { id: 'user-demo', name: body.email.split('@')[0], email: body.email }; writeStore(store); localStorage.setItem('kurio-session', 'demo-session')
    return HttpResponse.json(store.user)
  }),
  http.post('/api/account', async ({ request }) => {
    const body = await request.json() as { name: string; email: string; password: string }
    if (body.email === 'existente@kurio.test') return HttpResponse.json({ message: 'Este e-mail já está cadastrado.' }, { status: 409 })
    if (!body.name || !body.email.includes('@') || body.password.length < 6) return HttpResponse.json({ message: 'Revise os campos informados.' }, { status: 422 })
    const store = readStore(); store.user = { id: 'user-demo', name: body.name, email: body.email }; writeStore(store); localStorage.setItem('kurio-session', 'demo-session'); return HttpResponse.json(store.user, { status: 201 })
  }),
  http.post('/api/session/logout', () => {
    const store = readStore()
    store.user = undefined
    writeStore(store)
    localStorage.removeItem('kurio-session')
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/cart', () => HttpResponse.json(readStore().cart)),
  http.post('/api/cart/items', async ({ request }) => {
    const item = await request.json() as CartItem; const store = readStore(); const nft = products.find((product) => product.id === item.nftId)
    if (!nft || item.quantity > nft.available) return HttpResponse.json({ message: 'Edição indisponível.' }, { status: 409 })
    const existing = store.cart.items.find((row) => row.nftId === item.nftId); if (existing) existing.quantity = Math.min(nft.available, existing.quantity + item.quantity); else store.cart.items.push(item)
    store.cart.version += 1; writeStore(store); return HttpResponse.json(store.cart)
  }),
  http.patch('/api/cart/items/:id', async ({ params, request }) => {
    const { quantity } = await request.json() as { quantity: number }; const store = readStore(); const nft = products.find((product) => product.id === params.id); const item = store.cart.items.find((row) => row.nftId === params.id)
    if (!nft || !item || quantity < 1 || quantity > nft.available) return HttpResponse.json({ message: 'Quantidade indisponível.' }, { status: 409 })
    item.quantity = quantity; store.cart.version += 1; writeStore(store); return HttpResponse.json(store.cart)
  }),
  http.delete('/api/cart/items/:id', ({ params }) => { const store = readStore(); store.cart.items = store.cart.items.filter((item) => item.nftId !== params.id); store.cart.version += 1; writeStore(store); return HttpResponse.json(store.cart) }),
  http.post('/api/quote', async ({ request }) => {
    const activeScenario = await scenarioDelay(request)
    if (activeScenario === 'offline') return HttpResponse.json({ message: 'Conexão indisponível.' }, { status: 503 })
    const { coupon } = await request.json() as { coupon?: string }
    const store = readStore()
    if (coupon && coupon !== 'KURIO10') return HttpResponse.json({ message: coupon === 'EXPIRADO' ? 'Cupom expirado.' : 'Cupom inválido.' }, { status: 422 })
    if (activeScenario === 'price-changed') {
      const updated = products.find((nft) => nft.id === 'sage-009')
      if (updated) { updated.price = '1.74'; updated.version += 1 }
    }
    store.cart.coupon = coupon; writeStore(store); return HttpResponse.json(quote(store.cart.items, coupon))
  }),
  http.get('/api/favorites', () => HttpResponse.json(readStore().favorites)),
  http.put('/api/favorites/:id', ({ params }) => { if (!currentUser()) return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 }); const store = readStore(); if (!store.favorites.includes(String(params.id))) store.favorites.push(String(params.id)); writeStore(store); return HttpResponse.json(store.favorites) }),
  http.delete('/api/favorites/:id', ({ params }) => { const store = readStore(); store.favorites = store.favorites.filter((id) => id !== params.id); writeStore(store); return HttpResponse.json(store.favorites) }),
  http.get('/api/profile', () => currentUser() ? HttpResponse.json(currentUser()) : HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })),
  http.patch('/api/profile', async ({ request }) => {
    if (!currentUser()) return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    const data = await request.json() as Partial<User> & { currentPassword?: string; nextPassword?: string }
    if (!data.name || !data.email?.includes('@')) return HttpResponse.json({ message: 'Informe nome e e-mail válidos.' }, { status: 422 })
    if (data.nextPassword && (!data.currentPassword || data.nextPassword.length < 6)) return HttpResponse.json({ message: 'Informe a senha atual e uma nova senha com pelo menos 6 caracteres.' }, { status: 422 })
    const { currentPassword: _currentPassword, nextPassword: _nextPassword, ...profile } = data
    const store = readStore()
    store.user = { ...store.user!, ...profile }
    writeStore(store)
    return HttpResponse.json(store.user)
  }),
  http.get('/api/wallets', () => currentUser() ? HttpResponse.json(readStore().wallets) : HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })),
  http.post('/api/wallets', async ({ request }) => { const wallet = await request.json() as { label: string; address: string; network: 'Ethereum' | 'Polygon' | 'Solana' }; const store = readStore(); const next = { ...wallet, id: crypto.randomUUID(), primary: !store.wallets.length }; store.wallets.push(next); writeStore(store); return HttpResponse.json(next, { status: 201 }) }),
  http.patch('/api/wallets/:id', async ({ params, request }) => { if (!currentUser()) return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 }); const patch = await request.json() as { label: string; address: string; network: 'Ethereum' | 'Polygon' | 'Solana' }; const store = readStore(); const index = store.wallets.findIndex((wallet) => wallet.id === params.id); if (index === -1) return HttpResponse.json({ message: 'Carteira não encontrada.' }, { status: 404 }); store.wallets[index] = { ...store.wallets[index], ...patch }; writeStore(store); return HttpResponse.json(store.wallets[index]) }),
  http.post('/api/orders', async ({ request }) => {
    if (!currentUser()) return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    const body = await request.json() as { idempotencyKey?: string; quote?: Quote; cartVersion?: number; network?: string; walletId?: string }
    if (!body.idempotencyKey) return HttpResponse.json({ message: 'Chave de idempotência obrigatória.' }, { status: 422 })
    const store = readStore()
    const fingerprint = JSON.stringify({ cartVersion: body.cartVersion, network: body.network, walletId: body.walletId })
    const existing = store.orders.find((order) => order.transactionId === body.idempotencyKey)
    if (existing) {
      const existingFingerprint = (existing as Order & { fingerprint?: string }).fingerprint
      return existingFingerprint && existingFingerprint !== fingerprint
        ? HttpResponse.json({ message: 'A chave de idempotência já foi usada com outra compra.' }, { status: 409 })
        : HttpResponse.json(existing)
    }
    if (!store.cart.items.length) return HttpResponse.json({ message: 'Seu carrinho está vazio.' }, { status: 409 })
    const availabilityConflict = store.cart.items.some((item) => (products.find((nft) => nft.id === item.nftId)?.available ?? 0) < item.quantity)
    if (availabilityConflict) return HttpResponse.json({ message: 'Uma edição ficou indisponível. Revise seu carrinho.' }, { status: 409 })
    const current = quote(store.cart.items, store.cart.coupon)
    if (!body.quote || JSON.stringify(body.quote) !== JSON.stringify(current) || body.cartVersion !== store.cart.version) return HttpResponse.json({ message: 'A cotação mudou. Revise o total antes de confirmar.' }, { status: 409 })
    const activeScenario = scenario(request)
    const order: Order & { fingerprint: string } = { id: `order-${Date.now()}`, status: activeScenario === 'payment-declined' ? 'declined' : activeScenario === 'payment-pending' ? 'pending' : 'confirmed', items: structuredClone(store.cart.items), quote: current, transactionId: body.idempotencyKey, createdAt: new Date().toISOString(), fingerprint }
    store.orders.push(order)
    if (order.status === 'confirmed') store.cart = { items: [], version: store.cart.version + 1 }
    writeStore(store)
    if (activeScenario === 'timeout') { await delay(8_500); return HttpResponse.json(order, { status: 201 }) }
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('/api/orders/:id', ({ params }) => { const order = readStore().orders.find((item) => item.id === params.id); return order ? HttpResponse.json(order) : HttpResponse.json({ message: 'Pedido não encontrado.' }, { status: 404 }) }),
]

const realtime = ws.link(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/realtime/`)
handlers.push(realtime.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection)
  io.server.on('subscribe', () => {
    globalThis.setTimeout(() => io.client.emit('nft.updated', { id: 'sage-009', price: '1.74', available: 8, version: 2 }), 8_000)
  })
}))
