import { addToCart, confirmPurchase, expect, mocks, open, prepareCheckout, setScenario, test, waitForSocket } from './support'

test.describe('tempo real (Socket.IO via MSW)', () => {
  test('alteração de preço durante o checkout atualiza o resumo e exige nova confirmação', async ({ page }) => {
    await prepareCheckout(page, 'sage-009')
    await waitForSocket(page)
    await expect(page.locator('.checkout-summary__total')).toContainText('1.81 ETH')

    await mocks(page, (controls) => controls.updateNft('sage-009', { price: '1.80' }))
    await expect(page.locator('main').getByText('Sage Nomad #009: o preço mudou de 1.69 ETH para 1.80 ETH. O resumo foi atualizado.')).toBeVisible()
    await expect(page.locator('.checkout-summary__total')).toContainText('1.92 ETH')
    await expect(page.getByTestId('live-assertive')).toContainText(/preço mudou|valores do pedido mudaram/)

    // A cotação desatualizada não pode ser confirmada.
    const confirm = page.getByRole('button', { name: 'Confirmar pedido' })
    await expect(confirm).toBeDisabled()
    await page.getByRole('button', { name: 'Aceitar novo total de 1.92 ETH' }).click()
    await expect(confirm).toBeEnabled()
    await confirmPurchase(page)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await expect(page.locator('.order-confirmation')).toContainText('1.92 ETH')
  })

  test('disponibilidade reduzida no carrinho é sinalizada e bloqueia a finalização', async ({ page }) => {
    await addToCart(page, 'cosmic-118', { edition: '1/10', quantity: 2 })
    await waitForSocket(page)
    await mocks(page, (controls) => controls.updateNft('cosmic-118', { editions: [{ label: '1/10', available: 1 }] }))
    await expect(page.locator('main').getByText('Cosmic Bloom #118: restam 1 unidade(s) da edição 1/10.', { exact: false })).toBeVisible()
    await expect(page.getByText('Restam 1. Reduza a quantidade.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar para pagamento' })).toBeDisabled()
  })

  test('eventos duplicados ou antigos não regridem o estado', async ({ page }) => {
    await open(page, '/nft/sage-009')
    await waitForSocket(page)
    const price = page.locator('.detail-price-row strong')
    await expect(price).toHaveText('1.69 ETH')
    await mocks(page, (controls) => controls.updateNft('sage-009', { price: '2.10' }))
    await expect(price).toHaveText('2.10 ETH')

    await mocks(page, (controls) => controls.emitStaleNftEvent('sage-009', '0.50'))
    await mocks(page, (controls) => controls.replayLastEvent('nft.updated'))
    await page.waitForTimeout(500)
    await expect(price).toHaveText('2.10 ETH')

    // Catálogo também reflete a versão mais recente.
    await open(page, '/?q=sage')
    await expect(page.locator('.artwork-card').first()).toContainText('2.10 ETH')
  })

  test('desconexão com pedido pendente: reconecta, reconcilia e não duplica a compra', async ({ page }) => {
    await prepareCheckout(page)
    await setScenario(page, 'payment-pending')
    await confirmPurchase(page)
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()
    const [order] = await mocks(page, (controls) => controls.orders())

    // Recarregar durante o processamento recupera o mesmo pedido.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()
    await waitForSocket(page)

    // Queda de conexão: o evento de confirmação é perdido, mas a reconexão reconcilia via REST.
    await mocks(page, (controls) => controls.dropConnections())
    await mocks(page, (controls, id) => controls.settleOrder(id, 'confirmed'), order.id)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })

    // Evento antigo de "pendente" não reabre um pedido terminal.
    await waitForSocket(page)
    await mocks(page, (controls, id) => controls.emitStaleOrderEvent(id, 'pending'), order.id)
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect(await mocks(page, (controls) => controls.orders().length)).toBe(1)
  })
})
