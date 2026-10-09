const TOKEN_KEY = 'kurio-session-token'
const GUEST_KEY = 'kurio-guest-id'

type Listener = (token: string | null) => void
const listeners = new Set<Listener>()

function safeGet(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

export function getSessionToken() {
  return safeGet(TOKEN_KEY)
}

export function setSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* armazenamento indisponível */ }
  for (const listener of listeners) listener(token)
}

export function subscribeSessionToken(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Identificador anônimo do carrinho do visitante (equivalente a um cookie de carrinho). */
export function getGuestId() {
  let id = safeGet(GUEST_KEY)
  if (!id) {
    id = crypto.randomUUID()
    try { localStorage.setItem(GUEST_KEY, id) } catch { /* armazenamento indisponível */ }
  }
  return id
}

/** Gera um novo carrinho anônimo (após logout, nenhum dado do usuário anterior é reaproveitado). */
export function resetGuestId() {
  try { localStorage.removeItem(GUEST_KEY) } catch { /* armazenamento indisponível */ }
  return getGuestId()
}

const EXPIRED_KEY = 'kurio-session-expired'

/** Lembra que a sessão expirou (e não que o usuário simplesmente não entrou) para orientar o login. */
export function markSessionExpired() {
  try { sessionStorage.setItem(EXPIRED_KEY, '1') } catch { /* armazenamento indisponível */ }
}

export function consumeSessionExpired() {
  try {
    const expired = sessionStorage.getItem(EXPIRED_KEY) === '1'
    sessionStorage.removeItem(EXPIRED_KEY)
    return expired
  } catch {
    return false
  }
}
