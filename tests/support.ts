import { expect, test as base, type Page } from '@playwright/test'
import type { MockControls } from '../src/mocks/control'

declare global {
  interface Window { __kurioMocks?: MockControls }
}

export const USERS = {
  demo: { email: 'demo@kurio.test', password: '123456', name: 'Colecionador Demo' },
  ana: { email: 'ana@kurio.test', password: 'colecao123', name: 'Ana Ribeiro' },
}

export type Scenario = Parameters<MockControls['setScenario']>[0]

/**
 * Cada teste recebe um contexto novo do navegador (localStorage vazio = cenário conhecido).
 * `mocks` controla a API simulada pela mesma camada usada na demonstração.
 */
export const test = base
export { expect }

export async function open(page: Page, path: string, scenario?: Scenario) {
  const url = new URL(path, 'http://placeholder')
  if (scenario) url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}${url.hash}`)
  await page.waitForFunction(() => Boolean(window.__kurioMocks))
}

export async function setScenario(page: Page, scenario: Scenario) {
  await page.evaluate((value) => window.__kurioMocks!.setScenario(value), scenario)
}

/** Executa uma função contra `window.__kurioMocks` dentro da página (o argumento é serializado). */
export async function mocks<T, A = undefined>(page: Page, fn: (controls: MockControls, arg: A) => T | Promise<T>, arg?: A): Promise<T> {
  return page.evaluate(
    ([source, value]) => new Function('controls', 'arg', `return (${source})(controls, arg)`)(window.__kurioMocks, value),
    [fn.toString(), arg] as const,
  ) as Promise<T>
}

export async function waitForSocket(page: Page) {
  await page.waitForFunction(() => (window.__kurioMocks?.connectionCount() ?? 0) > 0)
  // Garante que o "subscribe" autenticado foi processado antes de emitir eventos.
  await page.waitForTimeout(150)
}

export async function login(page: Page, user = USERS.demo, redirect = '/') {
  await open(page, `/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByLabel('E-mail de acesso').fill(user.email)
  await page.getByLabel('Senha de acesso').fill(user.password)
  await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function addToCart(page: Page, nftId: string, options: { edition?: string; quantity?: number } = {}) {
  await open(page, `/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (options.edition) await page.getByRole('radio', { name: new RegExp(`^${options.edition.replace('/', '\\/')}`) }).click()
  for (let index = 1; index < (options.quantity ?? 1); index += 1) await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/cart$/)
}

/** Faz login, coloca um item no carrinho e abre o checkout com a carteira principal conectada. */
export async function prepareCheckout(page: Page, nftId = 'sage-009', user = USERS.demo) {
  await login(page, user)
  await addToCart(page, nftId)
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByRole('button', { name: /^Conectar / }).click()
  await expect(page.getByText('● Conectada')).toBeVisible()
  await page.getByLabel('Li e concordo com os termos da compra.').check()
}

export async function confirmPurchase(page: Page) {
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(review).toBeVisible()
  await review.getByRole('button', { name: 'Confirmar compra' }).click()
}

export async function catalogScope(page: Page, isMobile: boolean) {
  if (!isMobile) return page.locator('.market-sidebar')
  await page.getByRole('button', { name: 'Abrir filtros' }).click()
  return page.getByRole('dialog', { name: 'Filtros' })
}

export async function noHorizontalOverflow(page: Page) {
  const [scrollWidth, width] = await page.evaluate(() => [document.scrollingElement!.scrollWidth, window.innerWidth])
  expect(scrollWidth, 'a página não deve ter rolagem horizontal').toBeLessThanOrEqual(width)
}
