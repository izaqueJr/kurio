import { expect, open, test } from './support'

test.describe('detalhe do NFT', () => {
  test('acesso direto exibe galeria, informações, edição e limite de quantidade', async ({ page }) => {
    await open(page, '/nft/neon-552')
    await expect(page.getByRole('heading', { level: 1, name: 'Neon Vessel #552' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Neon Vessel #552', exact: true })).toBeVisible()

    // Edição indisponível não pode ser escolhida.
    await expect(page.getByRole('radio', { name: /^1\/1 \(esgotada\)/ })).toBeDisabled()
    await expect(page.getByRole('radio', { name: /^1\/50/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('5 unidades disponíveis na edição 1/50.')).toBeVisible()

    // Limite de quantidade pela disponibilidade da edição.
    const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
    for (let index = 0; index < 4; index += 1) await increase.click()
    await expect(page.getByLabel('Quantidade: 5')).toBeVisible()
    await expect(increase).toBeDisabled()

    // Trocar para uma edição menor reinicia a quantidade e respeita o novo limite.
    await page.getByRole('radio', { name: /^ABERTA|^Aberta/ }).click()
    await expect(page.getByText('3 unidades disponíveis na edição Aberta.')).toBeVisible()
    await expect(page.getByLabel('Quantidade: 1')).toBeVisible()
  })

  test('NFT inexistente e rota inexistente exibem 404 com retorno ao mercado', async ({ page }) => {
    await open(page, '/nft/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
    await expect(page).toHaveURL(/\/#mercado$/)

    await open(page, '/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('NFT esgotado não pode ser comprado', async ({ page }) => {
    await open(page, '/nft/golden-195')
    await expect(page.getByText('Todas as edições estão esgotadas.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ESGOTADO' })).toBeDisabled()
  })

  test('abas de detalhes e avaliações alternam por clique e teclado', async ({ page }) => {
    await open(page, '/nft/cosmic-118')
    const details = page.getByRole('tab', { name: 'Detalhes do NFT' })
    const reviews = page.getByRole('tab', { name: /Avaliações de colecionadores/ })
    await expect(details).toHaveAttribute('aria-selected', 'true')
    await details.focus()
    await page.keyboard.press('ArrowRight')
    await expect(reviews).toHaveAttribute('aria-selected', 'true')
    await expect(reviews).toBeFocused()
    await expect(page.getByText('Luna Matos')).toBeVisible()
  })
})

test.describe('carrossel de produtos (Swiper)', () => {
  for (const { path, section } of [
    { path: '/nft/emerald-042', section: '.detail-related' },
    { path: '/cart', section: '.cart-related' },
  ]) {
    test(`exibe 5 itens no desktop e 2 no mobile, navega pelos dots e por arrasto em ${path}`, async ({ page, isMobile }) => {
      await open(page, path)
      const carousel = page.locator(`${section} .product-carousel`)
      await carousel.scrollIntoViewIfNeeded()
      await expect(carousel.locator('.swiper-slide').first()).toBeVisible()
      const visible = await carousel.evaluate((node) => {
        const box = node.getBoundingClientRect()
        return [...node.querySelectorAll('.swiper-slide')].filter((slide) => {
          const rect = slide.getBoundingClientRect()
          return rect.left >= box.left - 1 && rect.right <= box.right + 1
        }).length
      })
      expect(visible).toBe(isMobile ? 2 : 5)

      const dots = page.locator(`${section}__dots button`)
      await expect(dots.first()).toHaveAttribute('aria-current', 'true')
      await dots.nth(1).click()
      await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
      await dots.first().click()
      await expect(dots.first()).toHaveAttribute('aria-current', 'true')

      // Arrastar para a esquerda avança uma página sem abrir o produto sob o cursor.
      const box = (await carousel.boundingBox())!
      const y = box.y + box.height / 3
      await page.mouse.move(box.x + box.width * 0.8, y)
      await page.mouse.down()
      for (let step = 1; step <= 12; step += 1) await page.mouse.move(box.x + box.width * (0.8 - step * 0.05), y)
      await page.mouse.up()
      await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
      await expect(page).toHaveURL(new RegExp(`${path}$`))
    })
  }
})
