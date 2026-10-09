/**
 * Sinal de transporte pronto. A interface renderiza imediatamente; apenas as chamadas de rede
 * (Axios e Socket.IO) aguardam, para que a camada de mocks — quando habilitada — já esteja
 * interceptando a rede. Sem mocks, o sinal é liberado no boot.
 */
let release: () => void = () => undefined
export const transportReady = new Promise<void>((resolve) => {
  release = resolve
})

export function markTransportReady() {
  release()
}
