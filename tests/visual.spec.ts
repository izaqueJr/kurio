import { addToCart, expect, login, noHorizontalOverflow, open, test } from './support'

/**
 * Regressão visual com dados estáveis (fixtures determinísticas, movimento reduzido,
 * fontes locais). Baselines versionadas em tests/__screenshots__/<projeto>/.
 */
test.describe('regressão visual', () => {
  test('início', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('.artwork-grid .artwork-card:not(.artwork-card--skeleton)')).toHaveCount(9)
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('home.png', { fullPage: true })
  })

  test('detalhe', async ({ page }) => {
    await open(page, '/nft/emerald-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.detail-related-card').first()).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await addToCart(page, 'emerald-042')
    await expect(page.locator('.cart-related-card').first()).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await login(page)
    await addToCart(page, 'emerald-042')
    await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('checkout.png', { fullPage: true })
  })

  test('telas sem overflow horizontal em tablet (768 px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await login(page)
    await addToCart(page, 'emerald-042')
    await noHorizontalOverflow(page)
    for (const path of ['/', '/nft/emerald-042', '/checkout', '/perfil', '/carteiras']) {
      await open(page, path)
      await expect(page.locator('main').first()).toBeVisible()
      await noHorizontalOverflow(page)
    }
  })
})
