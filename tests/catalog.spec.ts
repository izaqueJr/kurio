import { catalogScope, expect, noHorizontalOverflow, open, test } from './support'

const results = (page: import('@playwright/test').Page) => page.locator('.catalog p[role="status"]')
const cards = (page: import('@playwright/test').Page) => page.locator('.artwork-grid .artwork-card')

test.describe('catálogo', () => {
  test('busca, filtros combinados, ordenação e paginação compõem a URL e sobrevivem ao histórico e ao refresh', async ({ page, isMobile }) => {
    await open(page, '/?q=a')
    await expect(results(page)).toContainText('NFTs encontrados para "a"')

    // Filtro de coleção: reinicia a paginação.
    let scope = await catalogScope(page, isMobile)
    await scope.getByRole('button', { name: /^Fotografia/ }).click()
    await expect(page).toHaveURL(/category=Fotografia/)
    await expect(page).toHaveURL(/q=a/)
    await expect(results(page)).toContainText('página 1 de 2')

    await page.getByRole('button', { name: 'Página 2', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(results(page)).toContainText('página 2 de 2')

    // Segundo filtro combinado: a paginação volta para a primeira página.
    scope = await catalogScope(page, isMobile)
    await scope.getByRole('button', { name: /^Polygon/ }).click()
    if (isMobile) await page.keyboard.press('Escape')
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page).toHaveURL(/network=Polygon/)
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('Neon Vessel')

    // Ordenação (no mobile fica dentro do drawer de filtros).
    if (isMobile) {
      await page.getByRole('button', { name: 'Abrir filtros' }).click()
      await page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: 'Maior preço' }).click()
    } else {
      await page.getByRole('button', { name: /Ordenar por/ }).click()
      await page.getByRole('menuitemradio', { name: 'Maior preço' }).click()
    }
    await expect(page).toHaveURL(/sort=price-desc/)

    // Histórico: voltar restaura o estado anterior (sem ordenação) e depois a página 2 sem rede.
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=price-desc/)
    await expect(page).toHaveURL(/network=Polygon/)
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(results(page)).toContainText('página 2 de 2')
    await page.goForward()
    await expect(page).toHaveURL(/network=Polygon/)

    // Refresh mantém o estado vindo da URL.
    await page.reload()
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('Neon Vessel')
  })

  test('ordenação por menor preço reflete os parâmetros enviados à API', async ({ page }) => {
    const request = page.waitForRequest((req) => req.url().includes('/api/nfts?') && req.url().includes('sort=price-asc'))
    await open(page, '/?sort=price-asc')
    await request
    await expect(page.locator('.artwork-grid .artwork-card__price').first()).toBeVisible()
    const prices = await page.locator('.artwork-card__price').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(node.textContent ?? '0')))
    expect(prices.length).toBeGreaterThan(1)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  })

  test('resultado vazio oferece limpar filtros', async ({ page }) => {
    await open(page, '/?q=inexistente-xyz')
    await expect(page.getByText('Nenhum NFT encontrado para estes filtros.')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page).not.toHaveURL(/q=/)
    await expect(cards(page)).toHaveCount(9)
  })

  test('respostas fora de ordem não sobrescrevem a consulta mais recente', async ({ page }) => {
    // Cenário: a página 1 responde em 1,8 s e as demais em 150 ms.
    await open(page, '/?page=2', 'variable-latency')
    await expect(results(page)).toContainText('página 2')
    await page.getByRole('button', { name: 'Página 1', exact: true }).click()
    await page.getByRole('button', { name: 'Página 3', exact: true }).click()
    await expect(page).toHaveURL(/page=3/)
    await expect(results(page)).toContainText('página 3')
    await page.waitForTimeout(2_200)
    await expect(results(page)).toContainText('página 3')
    await expect(page.getByRole('button', { name: 'Página 3', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  test('layout responsivo sem overflow horizontal em 390, 768 e 1440 px', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, '/')
      await expect(cards(page).first()).toBeVisible()
      await noHorizontalOverflow(page)
    }
  })
})

test('menu do cabeçalho marca apenas a seção da URL atual', async ({ page, isMobile }) => {
  test.skip(isMobile, 'No mobile o menu fica recolhido.')
  const nav = page.locator('.site-nav')
  const current = nav.locator('a.is-current')
  await open(page, '/')
  await expect(current).toHaveText('Início')
  await expect(nav.locator('[aria-current]')).toHaveCount(1)
  await nav.getByRole('link', { name: 'Mercado', exact: true }).click()
  await expect(page).toHaveURL(/#mercado$/)
  await expect(current).toHaveText('Mercado')
  await expect(nav.getByRole('link', { name: 'Mercado', exact: true })).toHaveAttribute('aria-current', 'page')
  for (const path of ['/nft/sage-009', '/cart', '/login']) {
    await open(page, path)
    await expect(page.locator('main').first()).toBeVisible()
    await expect(current).toHaveCount(0)
  }
})
