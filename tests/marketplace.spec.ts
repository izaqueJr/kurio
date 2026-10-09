import { expect, test } from '@playwright/test'

test('direct product access adds an NFT to the cart', async ({ page }) => {
  await page.goto('/nft/emerald-042')
  await expect(page.getByRole('heading', { name: /Emerald Ape/ })).toBeVisible()
  await page.getByRole('button', { name: 'Comprar' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('heading', { name: 'Seu carrinho' })).toBeVisible()
})

test('header navega para as seções corretas da home', async ({ page }, testInfo) => {
  await page.goto('/nft/emerald-042')
  if (testInfo.project.name === 'mobile') return

  await expect(page.getByRole('link', { name: 'Início', exact: true })).toHaveAttribute('href', '/#inicio')
  await expect(page.getByRole('link', { name: 'Mercado', exact: true })).toHaveAttribute('href', '/#mercado')
  await expect(page.getByRole('link', { name: 'Criadores', exact: true })).toHaveAttribute('href', '/#criadores')
  await expect(page.getByRole('link', { name: 'Aprenda', exact: true })).toHaveAttribute('href', '/#aprenda')
})

test('busca sugere um NFT enquanto o usuário digita', async ({ page }, testInfo) => {
  await page.goto('/')
  if (testInfo.project.name === 'mobile') return

  await page.getByRole('button', { name: 'Pesquisar' }).click()
  await page.getByLabel('Buscar NFTs', { exact: true }).fill('emerald')
  const suggestion = page.getByRole('option', { name: 'Abrir Emerald Ape #042' })
  await expect(suggestion).toBeVisible()
  await suggestion.click()
  await expect(page).toHaveURL('/nft/emerald-042')
})

test('mobile apresenta banner próprio e filtros em modal', async ({ page }, testInfo) => {
  await page.goto('/')
  if (testInfo.project.name !== 'mobile') return

  await expect(page.getByRole('img', { name: 'Seja dono da cultura digital' })).toBeVisible()
  await expect(page.getByLabel('Buscar NFTs no mercado')).toBeVisible()
  await page.getByRole('button', { name: 'Filtros' }).click()
  await expect(page.getByRole('dialog', { name: 'Filtros do marketplace' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar filtros' }).last().click()
  await expect(page.getByRole('dialog', { name: 'Filtros do marketplace' })).toBeHidden()
})

test('o header mantém busca e minicart consistentes fora da home', async ({ page }, testInfo) => {
  await page.goto('/nft/sage-009')
  if (testInfo.project.name === 'mobile') return

  const header = page.locator('.detail-header')
  await expect(header.locator('img[src$="cart.svg"]')).toHaveCount(1)
  await expect(header.locator('img[src$="badge.svg"]')).toHaveCount(1)

  await header.getByRole('button', { name: 'Pesquisar' }).click()
  await header.getByLabel('Buscar NFTs').fill('cosmic')
  await expect(header.getByRole('option', { name: 'Abrir Cosmic Bloom #118' })).toBeVisible()
})

test('login modal validates and keeps checkout intent', async ({ page }) => {
  await page.goto('/nft/emerald-042')
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  const checkoutForm = page.locator('#checkout-form')
  await checkoutForm.getByLabel('Nome').fill('Colecionador Demo')
  await checkoutForm.getByLabel('E-mail').fill('demo@kurio.test')
  await checkoutForm.getByLabel('Li e concordo com os termos da compra.').check()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await modal.getByLabel('E-mail de acesso').fill('demo@kurio.test')
  await modal.getByLabel('Senha de acesso').fill('123456')
  await modal.getByRole('button', { name: 'Entrar' }).click()
  await expect(modal).toBeHidden()
  await expect(page).toHaveURL(/\/checkout$/)
})

test('checkout preenche os dados e a carteira principal após autenticar', async ({ page }) => {
  await page.goto('/nft/emerald-042')
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()

  const modal = page.getByRole('dialog')
  await modal.getByLabel('E-mail de acesso').fill('demo@kurio.test')
  await modal.getByLabel('Senha de acesso').fill('123456')
  await modal.getByRole('button', { name: 'Entrar' }).click()

  const checkoutForm = page.locator('#checkout-form')
  await expect(checkoutForm.getByLabel('Nome')).toHaveValue('demo')
  await expect(checkoutForm.getByLabel('E-mail')).toHaveValue('demo@kurio.test')
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
})

test('checkout autenticado cria o pedido e mostra a confirmação', async ({ page }) => {
  await page.goto('/nft/emerald-042')
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()

  const modal = page.getByRole('dialog')
  await modal.getByLabel('E-mail de acesso').fill('demo@kurio.test')
  await modal.getByLabel('Senha de acesso').fill('123456')
  await modal.getByRole('button', { name: 'Entrar' }).click()

  await page.getByLabel('Li e concordo com os termos da compra.').check()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page).toHaveURL(/\/order\/order-/)
  await expect(
    page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
  ).toBeVisible()
  await expect(page.getByText('Detalhes da transação')).toBeVisible()
})

test('authentication modal switches between login and account creation', async ({ page }, testInfo) => {
  await page.goto('/')
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Perfil' }).click()
  } else {
    await page.getByRole('button', { name: 'Entrar' }).click()
  }
  const modal = page.getByRole('dialog')

  await expect(modal.getByRole('tab', { name: 'Entrar' })).toHaveAttribute('aria-selected', 'true')
  await modal.getByRole('tab', { name: 'Criar conta' }).click()
  await expect(modal.getByRole('tab', { name: 'Criar conta' })).toHaveAttribute('aria-selected', 'true')
  await expect(modal.getByLabel('Nome de usuário')).toBeVisible()
  await expect(modal.getByLabel('Confirmar senha')).toBeVisible()
})

test('perfil persiste dados e cadastra uma carteira secundária', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Entrar' }).last().click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('E-mail de acesso').fill('demo@kurio.test')
  await modal.getByLabel('Senha de acesso').fill('123456')
  await modal.getByRole('button', { name: 'Entrar' }).click()

  const profileForm = page.locator('.account-form').first()
  await profileForm.getByLabel(/Nome de exibição/).fill('Colecionador Kurio')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Perfil atualizado')

  await page.goto('/carteiras')
  await page.getByRole('button', { name: 'Adicionar carteira', exact: true }).click()
  const walletForm = page.locator('.account-wallet-form')
  await walletForm.getByLabel(/Apelido da carteira/).fill('Carteira de teste')
  await walletForm.getByLabel(/Endereço da carteira/).fill('0x5A6e...dE90')
  await walletForm.getByLabel('Tipo de carteira').selectOption('WalletConnect')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByRole('status')).toContainText('Carteira salva')
  await expect(page.getByRole('button', { name: /Carteira de teste/ })).toBeVisible()
})

test('coupon updates the cart quote', async ({ page }) => {
  await page.goto('/nft/sage-009')
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.getByLabel('Cupom de desconto').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('status')).toContainText('Cupom aplicado')
  await expect(page.getByText('- 0.17 ETH')).toBeVisible()
})

test('NFT detail tabs alternate between details and collector reviews', async ({ page }) => {
  await page.goto('/nft/cosmic-118')
  const details = page.getByRole('tab', { name: 'Detalhes do NFT' })
  const reviews = page.getByRole('tab', { name: /Avaliações de colecionadores/ })

  await expect(details).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Contrato inteligente ERC-721 verificado.')).toBeVisible()
  await reviews.click()
  await expect(reviews).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Luna Matos')).toBeVisible()
  await expect(page.getByText('Contrato inteligente ERC-721 verificado.')).not.toBeVisible()
})

test('NFT collection slider changes page through its navigation dots', async ({ page }) => {
  await page.goto('/nft/cosmic-118')
  const secondPage = page.getByRole('button', { name: 'Ver página 2 da coleção' })

  await secondPage.click()
  await expect(secondPage).toHaveAttribute('aria-current', 'true')
  await expect(page.getByLabel('Página 2 de 2 da coleção')).toBeVisible()
})

test('cart breadcrumb links back to home and marketplace', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'O breadcrumb é substituído pelo botão de retorno em mobile.')
  await page.goto('/cart')
  const breadcrumb = page.getByRole('navigation', { name: 'Caminho de navegação' })

  await expect(breadcrumb.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/#inicio')
  await expect(breadcrumb.getByRole('link', { name: 'Mercado' })).toHaveAttribute('href', '/#mercado')
  await expect(breadcrumb.getByText('Carrinho')).toHaveAttribute('aria-current', 'page')
})

test('visual regression: início, detalhe, carrinho e pagamento', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled' })

  await page.goto('/nft/emerald-042')
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true, animations: 'disabled' })

  await page.getByRole('button', { name: 'Comprar' }).click()
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true, animations: 'disabled' })

  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page).toHaveScreenshot('checkout.png', { fullPage: true, animations: 'disabled' })
})
