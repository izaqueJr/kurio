import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
// Fonte do Figma servida localmente (sem dependência de CDN), apenas o subconjunto latino.
import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-700.css'
import './index.css'
import './styles/states.css'
import { markTransportFailed, markTransportReady } from './api/transport'
import { router } from './router'

/** O MSW é ligado por configuração (`VITE_ENABLE_MOCKS`, padrão: ligado) e pode ser desligado com `?no-mocks`. */
const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== 'false' && !new URLSearchParams(window.location.search).has('no-mocks')

function start() {
  // A interface renderiza sem esperar o MSW; Axios e Socket.IO aguardam `transportReady`
  // (o socket.io-client só é importado depois, ver realtime.ts). O MSW é baixado em paralelo.
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
  if (!mocksEnabled) {
    markTransportReady()
    return
  }
  void import('./mocks/browser')
    .then(({ startMocks }) => startMocks())
    .then(markTransportReady, markTransportFailed)
}

start()
