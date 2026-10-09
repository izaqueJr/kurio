# Contratos REST e eventos em tempo real

Os tipos de todos os contratos estão em [`src/domain.ts`](../src/domain.ts) e são compartilhados pelo cliente
(Axios + TanStack Query) e pelos handlers MSW ([`src/mocks/handlers.ts`](../src/mocks/handlers.ts)).

- Base: `VITE_API_URL` (padrão `/api`). JSON em UTF-8.
- Valores em ETH trafegam sempre como **strings decimais** (`"1.69"`). Quantidades são inteiros.
- Autenticação: `Authorization: Bearer <token>` (token recebido no login/cadastro).
- Carrinho de visitante: `x-guest-id: <uuid>` (identificador anônimo gerado no navegador).

## Erros

Todas as falhas usam o mesmo envelope (`ApiErrorBody`):

```json
{ "code": "VALIDATION", "message": "Revise os campos informados.", "fields": { "email": "Informe um e-mail válido." } }
```

| HTTP | `code` | Quando |
| --- | --- | --- |
| 422 | `VALIDATION`, `COUPON_INVALID`, `COUPON_EXPIRED` | Campos inválidos (com `fields`), cupom inválido/expirado |
| 401 | `UNAUTHENTICATED` | Recurso privado sem sessão |
| 401 | `SESSION_EXPIRED` | Token vencido (sessão de 30 min, renovada a cada chamada) |
| 401 | `INVALID_CREDENTIALS` | Login com e-mail/senha incorretos |
| 403 | `FORBIDDEN` | Recurso de outro usuário (ex.: pedido alheio) |
| 403 | `WALLET_REJECTED` | Carteira recusou a conexão |
| 404 | `NOT_FOUND` | NFT, pedido, carteira ou item inexistente |
| 409 | `CONFLICT` | E-mail já cadastrado, carteira duplicada, carrinho vazio |
| 409 | `AVAILABILITY_CONFLICT` | Quantidade acima da disponibilidade da edição |
| 409 | `QUOTE_CHANGED` | Cotação enviada difere da atual (traz `quote` atualizada) |
| 409 | `IDEMPOTENCY_CONFLICT` | Chave de idempotência reutilizada com outro conteúdo |
| 409 | `WALLET_NOT_CONNECTED` | Pedido com carteira desconectada |
| 500/503 | `TRANSIENT` | Falha transitória (o cliente pode repetir) |

Falhas de rede e timeout (8 s) são normalizadas no cliente como `NETWORK` e `TIMEOUT` ([`src/api/client.ts`](../src/api/client.ts)).

## Sessão e conta

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/account` | `{ name, email, password }` | `201 SessionResponse` · 409 · 422 |
| POST | `/session/login` | `{ email, password }` | `SessionResponse` · 401 `INVALID_CREDENTIALS` · 422 |
| GET | `/session` | — | `User` · 401 |
| POST | `/session/logout` | — | `204` |

`SessionResponse = { user: User, token: string, expiresAt: string }`. Senhas são guardadas como
SHA-256 com sal por usuário — nunca em claro. Login e cadastro **mesclam o carrinho do visitante** no carrinho da conta.

## Catálogo

| Método | Rota | Parâmetros | Resposta |
| --- | --- | --- | --- |
| GET | `/nfts` | `q, category, network, sort (recent\|price-asc\|price-desc), min, max, page, pageSize, collection, ids, exclude` | `NftListResponse` |
| GET | `/nfts/:id` | — | `Nft` · 404 |

`NftListResponse = { items, total, page, pageSize, facets: { categories, networks, priceRange } }`.
As facetas de cada dimensão consideram os demais filtros ativos. Cada `Nft` traz `editions: { id, label, available }[]`
e `version` (incrementada a cada alteração de preço ou estoque).

## Favoritos (autenticado)

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/favorites` | `string[]` (ids) |
| PUT | `/favorites/:id` | `string[]` |
| DELETE | `/favorites/:id` | `string[]` |

## Carrinho (visitante ou usuário)

Toda resposta é o `Cart` completo, com a cotação calculada pelo servidor:

```ts
Cart = { owner: 'guest' | 'user', lines: CartLine[], coupon?: string, version: number, quote: Quote }
CartLine = { id: '<nftId>:<edição>', nftId, edition, quantity, available, lineTotal, nft: { name, token, image, price, network, version } }
```

| Método | Rota | Corpo |
| --- | --- | --- |
| GET | `/cart` | — |
| POST | `/cart/items` | `{ nftId, edition, quantity }` |
| PATCH | `/cart/items/:lineId` | `{ quantity }` |
| DELETE | `/cart/items/:lineId` | — |
| PUT | `/cart/coupon` | `{ code }` (`KURIO10` = 10%, `EXPIRADO` = expirado) |
| DELETE | `/cart/coupon` | — |

## Cotação e pedidos (autenticado)

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/quote` | — | `Quote` |
| POST | `/orders` | `CreateOrderInput` | `201 Order` (novo) · `200 Order` (mesma tentativa) · 409 · 422 |
| GET | `/orders/:id` | — | `Order` · 403 · 404 |

`Quote = { id, subtotal, discount, networkFee, total, coupon?, valid, messages[] }`. O `id` é determinístico sobre
itens, preços, versões, cupom e taxas: qualquer mudança gera outro `id`.

`CreateOrderInput = { idempotencyKey, quoteId, cartVersion, network, walletId, buyer: { name, email, username, profileName, ens?, note? } }`.

Antes de criar o pedido o servidor **revalida** preço, disponibilidade por edição, cupom, taxas, carteira (cadastrada,
da rede escolhida e conectada) e a versão do carrinho. Idempotência: a mesma `idempotencyKey` com o mesmo conteúdo
devolve o mesmo pedido; com conteúdo diferente, `409 IDEMPOTENCY_CONFLICT`.

`Order = { id, status: 'pending' | 'confirmed' | 'declined', version, items: OrderItem[], quote, network, wallet, transactionHash, idempotencyKey, createdAt, settledAt?, failureReason? }`.
`items` é um **snapshot** (nome, imagem, edição, preço unitário e subtotal no momento da compra). Pedidos nascem
`pending`; a simulação os liquida (1,5 s por padrão). `confirmed` e `declined` são terminais. Na confirmação o
servidor baixa o estoque e remove do carrinho **apenas** as quantidades compradas.

## Perfil e carteiras (autenticado)

| Método | Rota | Corpo |
| --- | --- | --- |
| GET | `/profile` | — |
| PATCH | `/profile` | `{ name, email, username, ens, walletAlias, avatar }` (avatar como data URL ≤ 1 MB) |
| POST | `/profile/password` | `{ currentPassword, nextPassword }` → `204` |
| GET | `/wallets` | — |
| POST | `/wallets` | `WalletInput` |
| PATCH | `/wallets/:id` | `Partial<WalletInput>` (`primary: true` promove a principal) |
| POST | `/wallets/:id/connect` | — (simula a aprovação na carteira) |
| POST | `/wallets/:id/disconnect` | — |

Endereços são validados por rede: Ethereum/Polygon `0x` + 40 hex; Solana base58 (32–44).

## Eventos Socket.IO

Conexão: `io(VITE_SOCKET_URL ?? origem, { path: '/realtime', transports: ['websocket'] })`. Após conectar, o cliente
emite `subscribe { token }`; o servidor associa a conexão ao usuário e responde `subscribed { authenticated }`.

Envelope comum (`RealtimeEvent`):

```ts
{ eventId: string, type: string, resource: { type: 'nft' | 'order', id: string }, version: number, occurredAt: string, data: {...} }
```

| Evento | Destino | `data` |
| --- | --- | --- |
| `nft.updated` | todas as conexões | `{ price, previousPrice, available, editions }` |
| `order.updated` | apenas conexões autenticadas do dono do pedido | `{ status, failureReason? }` |

Regras do cliente ([`src/realtime.ts`](../src/realtime.ts)):

- **Duplicatas**: `eventId` já aplicado é descartado.
- **Ordem**: evento com `version` ≤ à última conhecida do recurso (via evento ou resposta REST) é descartado.
- **Sessão**: ao trocar de token a conexão é refeita do zero; eventos privados só chegam ao dono.
- **Reconexão**: ao reconectar, carrinho, cotação, pedidos e NFTs ativos são revalidados pelo REST.
