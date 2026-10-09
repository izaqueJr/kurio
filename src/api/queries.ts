import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type {
  Cart,
  CreateOrderInput,
  Nft,
  NftListParams,
  NftListResponse,
  Order,
  Quote,
  SessionResponse,
  User,
  Wallet,
  WalletInput,
} from '../domain'
import { announce } from '../lib/announcer'
import { api, ApiError, toApiError } from './client'
import { getSessionToken, markSessionExpired, resetGuestId, setSessionToken } from './session-storage'

/**
 * Chaves de cache. Tudo que é privado inclui o id do usuário para isolar dados entre sessões;
 * o carrinho usa o "dono" (usuário ou visitante).
 */
export const queryKeys = {
  session: ['session'] as const,
  nfts: (params: NftListParams) => ['nfts', params] as const,
  nftsRoot: ['nfts'] as const,
  nft: (id: string) => ['nft', id] as const,
  cart: (owner: string) => ['cart', owner] as const,
  cartRoot: ['cart'] as const,
  quote: (userId: string, cartVersion: number) => ['quote', userId, cartVersion] as const,
  quoteRoot: ['quote'] as const,
  favorites: (userId: string) => ['favorites', userId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
  order: (userId: string, id: string) => ['order', userId, id] as const,
  orderRoot: ['order'] as const,
}

// ---------- Sessão ----------

export const sessionQuery = queryOptions({
  queryKey: queryKeys.session,
  staleTime: 60_000,
  retry: false,
  queryFn: async ({ signal }): Promise<User | null> => {
    if (!getSessionToken()) return null
    try {
      return (await api.get<User>('/session', { signal })).data
    } catch (error) {
      const normalized = toApiError(error)
      if (normalized.code === 'UNAUTHENTICATED' || normalized.code === 'SESSION_EXPIRED') {
        if (normalized.code === 'SESSION_EXPIRED') markSessionExpired()
        setSessionToken(null)
        return null
      }
      throw normalized
    }
  },
})

export function useViewer() {
  const session = useQuery(sessionQuery)
  const user = session.data ?? null
  return { session, user, userId: user?.id, owner: user ? `user:${user.id}` : 'guest', isPending: session.isPending }
}

/**
 * Troca de identidade: nenhum dado em cache da sessão anterior sobrevive.
 * Consultas inativas são removidas; as ativas são zeradas e buscadas de novo com o novo token
 * (`resetQueries` mantém os observers da tela conectados, ao contrário de `clear`).
 */
function swapIdentity(queryClient: QueryClient, user: User | null) {
  void queryClient.cancelQueries()
  queryClient.removeQueries({ type: 'inactive', predicate: (query) => query.queryKey[0] !== 'session' })
  queryClient.setQueryData(queryKeys.session, user)
  void queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
}

export function establishSession(queryClient: QueryClient, response: SessionResponse) {
  setSessionToken(response.token)
  swapIdentity(queryClient, response.user)
}

export async function endSession(queryClient: QueryClient, { remote = true } = {}) {
  if (remote) await api.post('/session/logout').catch(() => undefined)
  setSessionToken(null)
  resetGuestId()
  swapIdentity(queryClient, null)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => (await api.post<SessionResponse>('/session/login', input)).data,
    onSuccess: (response) => {
      establishSession(queryClient, response)
      announce(`Você entrou como ${response.user.name}.`)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string }) => (await api.post<SessionResponse>('/account', input)).data,
    onSuccess: (response) => {
      establishSession(queryClient, response)
      announce('Conta criada com sucesso.')
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => endSession(queryClient),
    onSuccess: () => announce('Você saiu da sua conta.'),
  })
}

// ---------- Catálogo ----------

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: queryKeys.nfts(params),
    queryFn: async ({ signal }) => (await api.get<NftListResponse>('/nfts', { params, signal, paramsSerializer: { indexes: null } })).data,
  })
}

export function useNfts(params: NftListParams, options: { keepPrevious?: boolean; enabled?: boolean } = {}) {
  return useQuery({ ...nftListQuery(params), placeholderData: options.keepPrevious ? keepPreviousData : undefined, enabled: options.enabled })
}

export function nftQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.nft(id),
    queryFn: async ({ signal }) => (await api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
    retry: (count, error) => toApiError(error).retryable && count < 1,
  })
}

// ---------- Favoritos (atualização otimista com rollback) ----------

export function useFavorites(userId?: string) {
  return useQuery({
    queryKey: queryKeys.favorites(userId ?? 'guest'),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => (await api.get<string[]>('/favorites', { signal })).data,
  })
}

export function useToggleFavorite(userId?: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.favorites(userId ?? 'guest')
  return useMutation({
    mutationFn: async ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      (favorite ? await api.put<string[]>(`/favorites/${nftId}`) : await api.delete<string[]>(`/favorites/${nftId}`)).data,
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      queryClient.setQueryData<string[]>(key, (current = []) => (favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId)))
      return { previous }
    },
    onError: (error, { name }, context) => {
      queryClient.setQueryData(key, context?.previous)
      announce(`${toApiError(error).message} ${name} voltou ao estado anterior.`, 'assertive')
    },
    onSuccess: (favorites, { favorite, name }) => {
      queryClient.setQueryData(key, favorites)
      announce(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

// ---------- Carrinho ----------

export function useCart(owner: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.cart(owner),
    enabled: options.enabled ?? true,
    queryFn: async ({ signal }) => (await api.get<Cart>('/cart', { signal })).data,
  })
}

function useCartMutation<TVariables>(
  owner: string,
  request: (variables: TVariables) => Promise<Cart>,
  success?: (variables: TVariables) => string,
  { announceErrors = true } = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (cart, variables) => {
      queryClient.setQueryData(queryKeys.cart(owner), cart)
      void queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot })
      const message = success?.(variables)
      if (message) announce(message)
    },
    onError: (error) => {
      // Erros exibidos ao lado do campo (role=alert) não são anunciados duas vezes.
      if (announceErrors) announce(toApiError(error).message, 'assertive')
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(owner) })
    },
  })
}

export function useAddToCart(owner: string) {
  return useCartMutation(owner, async (input: { nftId: string; edition: string; quantity: number; name: string }) =>
    (await api.post<Cart>('/cart/items', { nftId: input.nftId, edition: input.edition, quantity: input.quantity })).data,
  (input) => `${input.name} adicionado ao carrinho.`)
}

export function useUpdateCartLine(owner: string) {
  return useCartMutation(owner, async (input: { lineId: string; quantity: number; name: string }) =>
    (await api.patch<Cart>(`/cart/items/${encodeURIComponent(input.lineId)}`, { quantity: input.quantity })).data,
  (input) => `Quantidade de ${input.name} alterada para ${input.quantity}.`)
}

export function useRemoveCartLine(owner: string) {
  return useCartMutation(owner, async (input: { lineId: string; name: string }) =>
    (await api.delete<Cart>(`/cart/items/${encodeURIComponent(input.lineId)}`)).data,
  (input) => `${input.name} removido do carrinho.`)
}

export function useApplyCoupon(owner: string) {
  return useCartMutation(owner, async (code: string) => (await api.put<Cart>('/cart/coupon', { code })).data, (code) => `Cupom ${code.toUpperCase()} aplicado.`, { announceErrors: false })
}

export function useRemoveCoupon(owner: string) {
  return useCartMutation(owner, async () => (await api.delete<Cart>('/cart/coupon')).data, () => 'Cupom removido.')
}

// ---------- Cotação e pedidos ----------

export function useQuote(userId: string | undefined, cartVersion: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.quote(userId ?? 'guest', cartVersion ?? 0),
    enabled: Boolean(userId) && enabled,
    staleTime: 0,
    queryFn: async ({ signal }) => (await api.post<Quote>('/quote', {}, { signal })).data,
  })
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => (await api.post<Order>('/orders', input)).data,
    // Reenvio automático após timeout/queda de rede, sempre com a MESMA chave de idempotência.
    retry: (count, error) => (error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK')) && count < 2,
    retryDelay: 500,
  })
}

export function orderQuery(userId: string, id: string) {
  return queryOptions({
    queryKey: queryKeys.order(userId, id),
    queryFn: async ({ signal }) => (await api.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })).data,
    // O Socket.IO é a fonte principal; a consulta periódica é só uma salvaguarda enquanto pendente.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 5_000 : false),
    retry: (count, error) => toApiError(error).retryable && count < 2,
  })
}

// ---------- Perfil e carteiras ----------

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<User, 'name' | 'email' | 'username' | 'ens' | 'walletAlias' | 'avatar'>) => (await api.patch<User>('/profile', input)).data,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user)
      announce('Perfil atualizado com sucesso.')
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; nextPassword: string }) => { await api.post('/profile/password', input) },
    onSuccess: () => announce('Senha alterada com sucesso.'),
  })
}

export function useWallets(userId?: string) {
  return useQuery({
    queryKey: queryKeys.wallets(userId ?? 'guest'),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => (await api.get<Wallet[]>('/wallets', { signal })).data,
  })
}

export function useSaveWallet(userId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: WalletInput }) =>
      (id ? await api.patch<Wallet>(`/wallets/${id}`, input) : await api.post<Wallet>('/wallets', input)).data,
    onSuccess: (wallet) => {
      announce(`Carteira ${wallet.label} salva com sucesso.`)
      return queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId ?? 'guest') })
    },
  })
}

export function useWalletConnection(userId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, connect }: { id: string; connect: boolean }) =>
      (await api.post<Wallet>(`/wallets/${id}/${connect ? 'connect' : 'disconnect'}`)).data,
    onSuccess: (wallet, { connect }) => {
      announce(connect ? `${wallet.label} conectada.` : `${wallet.label} desconectada.`)
      return queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId ?? 'guest') })
    },
  })
}
