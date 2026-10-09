import { confirmPurchase, expect, mocks, open, prepareCheckout, setScenario, test } from './support'

test.describe('pagamento e confirmação', () => {
  test('compra completa do catálogo ao recibo confirmado', async ({ page }) => {
    await prepareCheckout(page, 'sage-009')
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/order\/order-/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    const receipt = page.locator('.order-confirmation')
    await expect(receipt).toContainText('Sage Nomad #009')
    await expect(receipt).toContainText('1.81 ETH')

    // O recibo é um snapshot: alterar o catálogo depois não muda os valores.
    await mocks(page, (controls) => controls.updateNft('sage-009', { price: '9.99' }))
    await page.reload()
    await expect(receipt).toContainText('1.69 ETH cada')
    await expect(receipt).toContainText('1.81 ETH')

    // Apenas o que foi comprado sai do carrinho.
    await open(page, '/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('validação dos campos e revisão antes do envio', async ({ page }) => {
    await prepareCheckout(page)
    await page.getByLabel('Nome de exibição').fill('')
    await page.locator('#checkout-form').getByLabel('E-mail').fill('invalido')
    await page.getByLabel('Li e concordo com os termos da compra.').uncheck()
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    await expect(page.getByLabel('Nome de exibição')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByText('Aceite os termos para continuar.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByLabel('Nome de exibição').fill('Colecionador Demo')
    await page.locator('#checkout-form').getByLabel('E-mail').fill('demo@kurio.test')
    await page.getByLabel('Li e concordo com os termos da compra.').check()
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(review).toContainText('Sage Nomad #009')
    await review.getByRole('button', { name: 'Voltar', exact: true }).click()
    await expect(review).toBeHidden()
    expect(await mocks(page, (controls) => controls.orders().length)).toBe(0)
  })

  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await prepareCheckout(page)
    await setScenario(page, 'payment-declined')
    await confirmPurchase(page)
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await open(page, '/cart')
    await expect(page.getByRole('link', { name: 'Sage Nomad #009', exact: true })).toBeVisible()
  })

  test('cliques repetidos não duplicam o pedido', async ({ page }) => {
    await prepareCheckout(page)
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' })
    await confirm.dblclick()
    await expect(page).toHaveURL(/\/order\//)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect(await mocks(page, (controls) => controls.orders().length)).toBe(1)
  })

  test('timeout após a criação recupera o mesmo pedido pela chave de idempotência', async ({ page }) => {
    test.setTimeout(60_000)
    await prepareCheckout(page)
    await setScenario(page, 'order-timeout')
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/order\//, { timeout: 20_000 })
    const orders = await mocks(page, (controls) => controls.orders())
    expect(orders).toHaveLength(1)
    await expect(page).toHaveURL(new RegExp(`/order/${orders[0].id}$`))
  })

  test('reutilizar a chave com outro conteúdo gera conflito', async ({ page }) => {
    await prepareCheckout(page)
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('kurio-session-token')
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      const quote = await (await fetch('/api/quote', { method: 'POST', headers })).json()
      const cart = await (await fetch('/api/cart', { headers })).json()
      const buyer = { name: 'Demo', email: 'demo@kurio.test', username: 'demo', profileName: 'Demo' }
      const body = { idempotencyKey: 'chave-fixa', quoteId: quote.id, cartVersion: cart.version, network: 'Ethereum', walletId: 'wallet-demo-1', buyer }
      const first = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) })
      const same = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) })
      const different = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify({ ...body, network: 'Polygon', walletId: 'wallet-demo-2' }) })
      return { first: first.status, sameId: (await same.json()).id, sameStatus: same.status, different: different.status, code: (await different.json()).code }
    })
    expect(result.first).toBe(201)
    expect(result.sameStatus).toBe(200)
    expect(result.sameId).toMatch(/^order-/)
    expect(result.different).toBe(409)
    expect(result.code).toBe('IDEMPOTENCY_CONFLICT')
  })

  test('preço alterado ao confirmar exige nova confirmação', async ({ page }) => {
    await prepareCheckout(page)
    await setScenario(page, 'price-changed')
    await confirmPurchase(page)
    await expect(page.getByRole('alert').filter({ hasText: 'Os valores do pedido mudaram' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    await page.getByRole('button', { name: /Aceitar novo total de 1.86 ETH/ }).click()
    await setScenario(page, 'default')
    await confirmPurchase(page)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  })

  test('edição esgotada durante a compra bloqueia a confirmação e preserva o carrinho', async ({ page }) => {
    await prepareCheckout(page)
    await setScenario(page, 'sold-out')
    await confirmPurchase(page)
    await expect(page.getByText(/não tem mais a quantidade solicitada/).first()).toBeVisible()
    expect(await mocks(page, (controls) => controls.orders().length)).toBe(0)
    await setScenario(page, 'default')
    await open(page, '/cart')
    await expect(page.getByText('Edição esgotada. Remova o item para continuar.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar para pagamento' })).toBeDisabled()
  })

  test('carteira que recusa a conexão impede o envio', async ({ page }) => {
    await prepareCheckout(page)
    await page.getByRole('button', { name: /^Desconectar/ }).click()
    await setScenario(page, 'wallet-reject')
    await page.getByRole('button', { name: /^Conectar / }).click()
    await expect(page.locator('main').getByText('A conexão foi recusada na carteira.')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    await expect(page.getByText('Conecte a carteira selecionada para continuar.')).toBeVisible()
  })
})
