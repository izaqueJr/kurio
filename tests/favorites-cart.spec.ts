import { addToCart, expect, login, open, setScenario, test } from './support'

test.describe('favoritos', () => {
  test('favoritar é otimista e persiste após refresh', async ({ page }) => {
    await login(page)
    await open(page, '/nft/emerald-042')
    const favorite = page.getByRole('button', { name: 'Favoritar', exact: true })
    await favorite.click()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('live-polite')).toContainText('Emerald Ape adicionado aos favoritos.')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('falha da mutation desfaz a atualização otimista e informa o usuário', async ({ page }) => {
    await login(page)
    await open(page, '/nft/emerald-042')
    await setScenario(page, 'favorites-fail')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.locator('main').getByText(/Não foi possível salvar o favorito/)).toBeVisible()
    await expect(page.getByTestId('live-assertive')).toContainText('Emerald Ape voltou ao estado anterior.')
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toHaveAttribute('aria-pressed', 'false')

    // Recuperação: com a API saudável a mesma ação conclui.
    await setScenario(page, 'default')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('visitante é convidado a entrar antes de favoritar', async ({ page }) => {
    await open(page, '/nft/emerald-042')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

test.describe('carrinho', () => {
  test('quantidades, limite da edição, remoção e persistência após refresh', async ({ page }) => {
    await addToCart(page, 'cosmic-118', { edition: '1/10' })
    const increase = page.getByRole('button', { name: 'Aumentar quantidade de Cosmic Bloom' })
    const decrease = page.getByRole('button', { name: 'Diminuir quantidade de Cosmic Bloom' })
    await expect(decrease).toBeDisabled()
    await increase.click()
    await expect(page.getByLabel('2 unidade(s)')).toBeVisible()
    await expect(increase).toBeDisabled()
    await expect(page.locator('.cart-summary__fees')).toContainText('2.58 ETH')

    await page.reload()
    await expect(page.getByLabel('2 unidade(s)')).toBeVisible()

    await decrease.click()
    await expect(page.getByLabel('1 unidade(s)')).toBeVisible()
    await page.getByRole('button', { name: 'Remover Cosmic Bloom' }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('cupom inválido, expirado, aplicado e removido atualizam o resumo', async ({ page }) => {
    await addToCart(page, 'sage-009')
    const input = page.getByLabel('Cupom de desconto')
    await input.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(page.locator('#cart-promo-error')).toContainText('Cupom inválido.')
    await expect(input).toHaveAttribute('aria-invalid', 'true')

    await input.fill('EXPIRADO')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(page.locator('#cart-promo-error')).toContainText('Cupom expirado.')

    await input.fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(page.locator('.cart-summary__applied')).toContainText('KURIO10')
    await expect(page.locator('.cart-summary__fees')).toContainText('- 0.17 ETH')
    await expect(page.locator('.cart-summary__total')).toContainText('1.64 ETH')

    await page.reload()
    await expect(page.locator('.cart-summary__applied')).toContainText('KURIO10')
    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(page.locator('.cart-summary__total')).toContainText('1.81 ETH')
  })
})
