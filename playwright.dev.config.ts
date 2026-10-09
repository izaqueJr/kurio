import base from './playwright.config'

/** Mesmos testes contra o servidor de desenvolvimento (iteração rápida, sem build). */
export default {
  ...base,
  webServer: { ...base.webServer, command: 'npx vite --host 127.0.0.1 --port 4173 --strictPort' },
}
