import { delay } from 'msw'

/**
 * Cenários determinísticos da API simulada.
 * Selecionados por `?scenario=<nome>` na URL ou por `window.__kurioMocks.setScenario(nome)`.
 */
export const SCENARIOS = {
  default: 'Latência curta e estável; pagamentos confirmados após 1,5 s.',
  slow: 'Todas as respostas levam 1,5 s (skeletons e estados de carregamento).',
  'variable-latency': 'Catálogo com latência variável: a página 1 responde em 1,8 s e as demais em 150 ms (respostas fora de ordem).',
  timeout: 'Catálogo e detalhe excedem o timeout do cliente (8 s).',
  offline: 'Falha de conexão em todas as chamadas REST.',
  'server-error': 'Catálogo e detalhe respondem HTTP 500 (falha transitória).',
  empty: 'Catálogo sem resultados.',
  'session-expired': 'Toda chamada autenticada responde 401 SESSION_EXPIRED.',
  'price-changed': 'O preço do primeiro item do carrinho sobe ao confirmar o pedido.',
  'sold-out': 'A edição do primeiro item do carrinho esgota ao confirmar o pedido.',
  'order-timeout': 'O pedido é criado, mas a primeira resposta excede o timeout do cliente.',
  'payment-pending': 'O pagamento fica pendente por 8 s antes de ser confirmado.',
  'payment-declined': 'O pagamento é recusado após 1,5 s.',
  'favorites-fail': 'Inclusão e remoção de favoritos respondem HTTP 503.',
  'wallet-reject': 'A carteira recusa a conexão.',
  'live-market': 'Preços do carrinho mudam a cada 15 s via Socket.IO.',
} as const

export type Scenario = keyof typeof SCENARIOS
const SCENARIO_KEY = 'kurio-mock-scenario'

export function getScenario(): Scenario {
  try {
    const value = localStorage.getItem(SCENARIO_KEY)
    return value && value in SCENARIOS ? (value as Scenario) : 'default'
  } catch {
    return 'default'
  }
}

export function setScenario(value: Scenario) {
  if (!(value in SCENARIOS)) throw new Error(`Cenário desconhecido: ${value}`)
  if (value === 'default') localStorage.removeItem(SCENARIO_KEY)
  else localStorage.setItem(SCENARIO_KEY, value)
}

export const CLIENT_TIMEOUT_MS = 8_000
export const SETTLE_DELAY_MS = 1_500

/** Latência determinística por tipo de recurso e cenário. */
export async function latency(kind: 'catalog' | 'detail' | 'default', url?: URL) {
  const scenario = getScenario()
  if (scenario === 'slow') return delay(1_500)
  if (scenario === 'timeout' && kind !== 'default') return delay(CLIENT_TIMEOUT_MS + 1_000)
  if (scenario === 'variable-latency' && kind === 'catalog') {
    const page = Number(url?.searchParams.get('page') ?? 1)
    return delay(page === 1 ? 1_800 : 150)
  }
  return delay(kind === 'default' ? 80 : 120)
}
