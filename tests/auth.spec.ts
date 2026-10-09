import { addToCart, expect, login, noHorizontalOverflow, open, setScenario, test, USERS } from './support'

test.describe('conta e sessão', () => {
  test('cadastro valida campos e trata conflito de e-mail', async ({ page }) => {
    await open(page, '/cadastro')
    const panel = page.getByRole('tabpanel')
    await panel.getByRole('button', { name: 'Criar conta' }).click()
    const email = page.getByLabel('E-mail de acesso')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe um nome de usuário com ao menos 2 caracteres.')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('Outra Pessoa')
    await email.fill(USERS.demo.email)
    await page.getByLabel('Senha de acesso').fill('segredo1')
    await page.getByLabel('Confirmar senha').fill('segredo2')
    await panel.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('As senhas precisam ser iguais.')).toBeVisible()

    await page.getByLabel('Confirmar senha').fill('segredo1')
    await panel.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Este e-mail já está cadastrado.' })).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText('Este e-mail já está cadastrado.')

    await email.fill('nova.pessoa@kurio.test')
    await panel.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Perfil' }).first()).toBeAttached()
  })

  test('login rejeita credenciais inválidas e retorna ao fluxo anterior', async ({ page }) => {
    await open(page, '/perfil')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/)
    await page.getByLabel('E-mail de acesso').fill(USERS.demo.email)
    await page.getByLabel('Senha de acesso').fill('errada')
    await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
    await page.getByLabel('Senha de acesso').fill(USERS.demo.password)
    await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.demo.name)

    // Sessão recuperável após refresh.
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.demo.name)
  })

  test('expiração de sessão durante a navegação redireciona e retoma o destino', async ({ page }) => {
    await page.clock.install()
    await login(page, USERS.demo, '/perfil')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.demo.name)
    await page.clock.fastForward('31:00')
    // A expiração pode já ter sido detectada em segundo plano; senão, a navegação para Carteiras
    // faz uma chamada autenticada (GET /wallets) que a detecta.
    const wallets = page.getByRole('link', { name: 'Carteiras' }).filter({ visible: true }).first()
    if (await wallets.isVisible()) await wallets.click({ timeout: 3_000 }).catch(() => undefined)
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expect(page.locator('main').getByText('Sua sessão expirou')).toBeVisible()
    await page.getByLabel('E-mail de acesso').fill(USERS.demo.email)
    await page.getByLabel('Senha de acesso').fill(USERS.demo.password)
    await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
    // Retoma o destino em que a expiração foi detectada.
    await expect(page).toHaveURL(/\/(carteiras|perfil)$/)
  })

  test('expiração no checkout preserva os dados preenchidos para retomada', async ({ page }) => {
    await login(page)
    await addToCart(page, 'sage-009')
    await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
    await page.getByLabel('Observação do colecionador (opcional)').fill('Guardar esta observação')
    await setScenario(page, 'session-expired')
    await page.getByRole('button', { name: /^Conectar / }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout&reason=expired/)
    await setScenario(page, 'default')
    await page.getByLabel('E-mail de acesso').fill(USERS.demo.email)
    await page.getByLabel('Senha de acesso').fill(USERS.demo.password)
    await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Guardar esta observação')
    await expect(page.locator('main').getByText('Sage Nomad #009').first()).toBeVisible()
  })

  test('logout limpa dados privados e a troca de usuário não expõe dados do anterior', async ({ page }) => {
    await login(page, USERS.demo)
    await addToCart(page, 'emerald-042')
    await open(page, '/favoritos')
    await expect(page.getByRole('link', { name: /Sage Nomad/ })).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/$/)
    await open(page, '/favoritos')
    await expect(page).toHaveURL(/\/login/)

    await login(page, USERS.ana, '/favoritos')
    await expect(page.getByRole('link', { name: /Neon Vessel/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sage Nomad/ })).toHaveCount(0)
    await open(page, '/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

    // O carrinho da conta anterior continua dela.
    await open(page, '/perfil')
    await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/$/)
    await login(page, USERS.demo, '/cart')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  })

  test('carrinho do visitante é preservado ao autenticar', async ({ page, isMobile }) => {
    await addToCart(page, 'cosmic-118')
    if (isMobile) {
      await login(page, USERS.ana, '/cart')
    } else {
      await page.getByRole('button', { name: 'Entrar' }).first().click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('E-mail de acesso').fill(USERS.ana.email)
      await dialog.getByLabel('Senha de acesso').fill(USERS.ana.password)
      await dialog.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
      await expect(dialog).toBeHidden()
    }
    await expect(page.getByRole('link', { name: 'Cosmic Bloom #118', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Continuar para pagamento' })).toContainText('Finalizar pedido')
  })
})

test('avisos de login social e erros não geram overflow horizontal no modal', async ({ page }) => {
  await open(page, '/login')
  await page.getByLabel('E-mail de acesso').fill(USERS.demo.email)
  await page.getByLabel('Senha de acesso').fill('senha-errada')
  await page.getByRole('tabpanel').getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar com Google' }).click()
  await expect(page.getByText('O login com Google não está disponível nesta demonstração.')).toBeVisible()
  await noHorizontalOverflow(page)
  const [scrollWidth, clientWidth] = await page.locator('.auth-modal').evaluate((node) => [node.scrollWidth, node.clientWidth])
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})
