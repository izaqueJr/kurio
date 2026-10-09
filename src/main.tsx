import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './index.css'

async function start() {
  if (!new URLSearchParams(window.location.search).has('no-mocks')) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>)
}

void start()
