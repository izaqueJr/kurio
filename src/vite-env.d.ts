/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "false" desliga o MSW (padrão: ligado). */
  readonly VITE_ENABLE_MOCKS?: string
  /** URL base da API REST (padrão: /api). */
  readonly VITE_API_URL?: string
  /** Origem do servidor Socket.IO (padrão: a própria origem da aplicação). */
  readonly VITE_SOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
