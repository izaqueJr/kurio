const KEY = 'kurio-checkout-attempt'

type Attempt = { fingerprint: string; key: string }

function read(): Attempt | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Attempt | null } catch { return null }
}

/**
 * Uma tentativa de compra = mesma cotação, carteira, rede e versão do carrinho.
 * Enquanto o conteúdo não muda, cliques repetidos, reenvios após timeout ou um refresh
 * reutilizam a mesma chave; o servidor devolve o mesmo pedido em vez de criar outro.
 */
export function idempotencyKeyFor(fingerprint: string) {
  const current = read()
  if (current?.fingerprint === fingerprint) return current.key
  const next = { fingerprint, key: crypto.randomUUID() }
  try { sessionStorage.setItem(KEY, JSON.stringify(next)) } catch { /* armazenamento indisponível */ }
  return next.key
}

export function clearAttempt() {
  try { sessionStorage.removeItem(KEY) } catch { /* armazenamento indisponível */ }
}

export function readDraft<T>(key: string): Partial<T> {
  try { return JSON.parse(sessionStorage.getItem(key) ?? '{}') as Partial<T> } catch { return {} }
}

export function writeDraft(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* armazenamento indisponível */ }
}

export function clearDraft(key: string) {
  try { sessionStorage.removeItem(key) } catch { /* armazenamento indisponível */ }
}
