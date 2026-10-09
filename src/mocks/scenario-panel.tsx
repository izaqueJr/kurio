import { useEffect, useId, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { mockControls } from './control'
import { SCENARIOS, type Scenario } from './scenarios'
import './scenario-panel.css'

/**
 * Painel da simulação (somente com o MSW ativo): mostra o cenário atual e permite trocá-lo ou
 * restaurar os dados sem abrir o console. Fica em uma raiz React própria, fora da aplicação,
 * e usa os mesmos controles de `window.__kurioMocks`.
 */
function ScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [scenario, setScenario] = useState<Scenario>(mockControls.getScenario())
  const panelId = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    selectRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const apply = () => {
    mockControls.setScenario(scenario)
    window.location.reload()
  }
  const reset = () => {
    mockControls.reset()
    window.location.reload()
  }
  const active = mockControls.getScenario()

  return (
    <aside className="scenario-panel" aria-label="Simulação da API">
      <button
        ref={triggerRef}
        type="button"
        className={`scenario-panel__trigger${active !== 'default' ? ' is-custom' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Simulação: {active}
      </button>
      {open && (
        <div id={panelId} className="scenario-panel__body">
          <label htmlFor={`${panelId}-select`}>Cenário da API simulada</label>
          <select ref={selectRef} id={`${panelId}-select`} value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
            {(Object.keys(SCENARIOS) as Scenario[]).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <p>{SCENARIOS[scenario]}</p>
          <div className="scenario-panel__actions">
            <button type="button" onClick={apply} disabled={scenario === active}>Aplicar e recarregar</button>
            <button type="button" onClick={reset}>Resetar dados</button>
          </div>
          <p className="scenario-panel__hint">
            O cenário fica salvo neste navegador. "Resetar dados" restaura catálogo, contas, carrinhos e pedidos.
          </p>
        </div>
      )}
    </aside>
  )
}

export function mountScenarioPanel() {
  if (document.getElementById('scenario-panel-root')) return
  const container = document.createElement('div')
  container.id = 'scenario-panel-root'
  document.body.append(container)
  createRoot(container).render(<ScenarioPanel />)
}
