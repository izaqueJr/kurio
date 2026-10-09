/**
 * Sinal de transporte pronto. A interface renderiza imediatamente; apenas as chamadas de rede
 * (Axios e Socket.IO) aguardam, para que a camada de mocks — quando habilitada — já esteja
 * interceptando a rede. Sem mocks, o sinal é liberado no boot.
 *
 * O estado fica em `globalThis` para sobreviver ao hot reload do Vite: reavaliar este módulo
 * não pode criar uma promessa nova que ninguém mais libera.
 */
type TransportState = { ready: Promise<void>; release: () => void; failure?: unknown }

const store = globalThis as typeof globalThis & { __kurioTransport?: TransportState }

if (!store.__kurioTransport) {
  let release: () => void = () => undefined
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  store.__kurioTransport = { ready, release }
}

const state = store.__kurioTransport

export const transportReady = state.ready

export function markTransportReady() {
  state.release()
}

/** Falha ao iniciar a camada de mocks: libera as chamadas para que a interface mostre erro e permita nova tentativa. */
export function markTransportFailed(error: unknown) {
  state.failure = error
  console.error('[kurio] Não foi possível iniciar a API simulada (MSW).', error)
  state.release()
}
