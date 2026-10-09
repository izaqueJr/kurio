import { expect, open, setScenario, test } from './support'

test.describe('acessibilidade e teclado', () => {
  test('link para pular ao conteúdo é o primeiro foco', async ({ page }) => {
    await open(page, '/nft/sage-009')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('diálogo de autenticação prende o foco, fecha com Escape e devolve o foco', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No mobile o acesso é pela navegação inferior.')
    await open(page, '/')
    const trigger = page.getByRole('button', { name: 'Entrar' }).filter({ visible: true }).first()
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let index = 0; index < 15; index += 1) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('drawer de filtros no mobile controla o foco', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'O drawer existe apenas no mobile.')
    await open(page, '/')
    const trigger = page.getByRole('button', { name: 'Abrir filtros' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Filtros' })
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('ordenação operável pelo teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No mobile a ordenação fica no drawer de filtros (coberto no teste do catálogo).')
    await open(page, '/')
    const trigger = page.getByRole('button', { name: /Ordenar por/ })
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitemradio', { name: 'Listados recentemente' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(trigger).toBeFocused()
  })

  test('erros de formulário ficam associados aos campos', async ({ page }) => {
    await open(page, '/login')
    await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
    const email = page.getByLabel('E-mail de acesso')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(/Informe seu e-mail/)
  })
})

test.describe('carregamento, falhas e recuperação', () => {
  test('skeletons durante carregamento lento no catálogo, detalhe e carrinho', async ({ page }) => {
    await open(page, '/', 'slow')
    await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
    await expect(page.locator('.artwork-grid .artwork-card:not(.artwork-card--skeleton)').first()).toBeVisible()

    await page.goto('/nft/sage-009')
    await expect(page.locator('.detail-top[aria-busy="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()

    await page.goto('/cart')
    await expect(page.locator('.cart-summary--loading')).toBeAttached()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('falha do catálogo mostra feedback e recupera ao tentar novamente', async ({ page }) => {
    await open(page, '/', 'server-error')
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo.' })).toBeVisible({ timeout: 15_000 })
    await setScenario(page, 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('.artwork-grid .artwork-card').first()).toBeVisible()
  })

  test('falha de conexão no detalhe permite nova tentativa', async ({ page }) => {
    await open(page, '/nft/sage-009', 'offline')
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar este NFT' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Sem conexão com o servidor')).toBeVisible()
    await setScenario(page, 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
  })
})
