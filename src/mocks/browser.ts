import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { exposeMockControls, installMockControls } from './control'

export async function startMocks() {
  installMockControls()
  // Remove os parâmetros de controle da URL para não reaplicá-los em um refresh.
  const url = new URL(window.location.href)
  if (url.searchParams.has('scenario') || url.searchParams.has('reset-mocks')) {
    url.searchParams.delete('scenario')
    url.searchParams.delete('reset-mocks')
    window.history.replaceState(window.history.state, '', url)
  }
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  exposeMockControls()
  return worker
}
