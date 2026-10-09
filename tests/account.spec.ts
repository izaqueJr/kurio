import { expect, login, open, test, USERS } from './support'

// PNG 1x1 válido.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test.describe('perfil e carteiras', () => {
  test('edição de perfil e avatar persiste após refresh, com erros de validação', async ({ page }) => {
    await login(page, USERS.demo, '/perfil')
    await page.getByLabel('Nome de usuário').fill('x')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use de 3 a 30 letras, números, ponto, hífen ou sublinhado.')).toBeVisible()

    // Conflito retornado pela API (e-mail de outra conta) fica associado ao campo.
    await page.getByLabel('Nome de usuário').fill('colecionador.demo')
    await page.locator('form.account-form').getByLabel('E-mail').fill(USERS.ana.email)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Este e-mail já pertence a outra conta.')).toBeVisible()

    await page.locator('form.account-form').getByLabel('E-mail').fill(USERS.demo.email)
    await page.getByLabel('Nome de exibição').fill('Colecionador Kurio')
    await page.getByLabel('Escolher imagem de avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PIXEL })
    await expect(page.getByRole('img', { name: 'Pré-visualização do avatar' })).toBeVisible()
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.locator('main').getByText('Perfil atualizado com sucesso.')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Colecionador Kurio')
    await expect(page.getByRole('img', { name: 'Pré-visualização do avatar' })).toBeVisible()

    // Arquivo grande demais é rejeitado antes do envio.
    await page.getByLabel('Escolher imagem de avatar').setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(1_100_000, 1) })
    await expect(page.getByText('A imagem deve ter no máximo 1 MB.')).toBeVisible()
  })

  test('alteração de senha valida a senha atual e passa a valer no login', async ({ page }) => {
    await login(page, USERS.demo, '/perfil')
    await page.getByLabel('Senha atual').fill('senha-errada')
    await page.getByLabel('Nova senha', { exact: true }).fill('novaSenha1')
    await page.getByLabel('Confirmar nova senha').fill('outraSenha')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('A confirmação não corresponde à nova senha.')).toBeVisible()

    await page.getByLabel('Confirmar nova senha').fill('novaSenha1')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('A senha atual está incorreta.')).toBeVisible()

    await page.getByLabel('Senha atual').fill(USERS.demo.password)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.locator('main').getByText('Perfil atualizado e senha alterada com sucesso.')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/$/)
    await login(page, { ...USERS.demo, password: 'novaSenha1' }, '/perfil')
    await expect(page).toHaveURL(/\/perfil$/)
  })

  test('cadastro e edição de carteiras principal e secundária com validação', async ({ page }) => {
    await login(page, USERS.demo, '/carteiras')
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar carteira secundária' }).click()
    await expect(page.getByRole('heading', { name: 'Adicionar carteira secundária' })).toBeVisible()
    await page.getByLabel('Apelido da carteira').fill('Carteira de teste')
    await page.getByLabel('Endereço da carteira').fill('0x5A6e...dE90')
    await page.getByLabel('Tipo de carteira').selectOption('WalletConnect')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.')).toBeVisible()
    await expect(page.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Endereço da carteira').fill('0x5A6eE2D6bA8cA0dD3E3f2bF0d1A3b4C5d6E7f890')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.locator('main').getByText('Carteira Carteira de teste salva com sucesso.')).toBeVisible()
    const created = page.getByRole('button', { name: /Carteira de teste/ })
    await expect(created).toBeVisible()

    // Editar e promover a principal; o estado persiste após refresh.
    await created.click()
    await page.getByLabel('Apelido da carteira').fill('Carteira de teste editada')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByRole('button', { name: /Carteira de teste editada/ })).toBeVisible()
    await page.getByRole('button', { name: 'Tornar principal' }).click()
    await expect(page.locator('main').getByText('Carteira de teste editada agora é a carteira principal.')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: /Carteira de teste editada · principal/ })).toBeVisible()
  })

  test('perfil, carteiras e favoritos exigem autenticação', async ({ page }) => {
    for (const path of ['/perfil', '/carteiras', '/favoritos', '/checkout', '/order/order-00001']) {
      await open(page, path)
      await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    }
  })
})
