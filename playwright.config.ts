import { defineConfig, devices } from '@playwright/test'

/**
 * Por padrão os testes rodam contra o build de demonstração (vite build + preview), com MSW ativo.
 * `PW_SERVER=dev` usa o servidor de desenvolvimento para iterar mais rápido.
 */
const port = 4173
const useDev = process.env.PW_SERVER === 'dev'

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: useDev
      ? `npx vite --host 127.0.0.1 --port ${port} --strictPort`
      : `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
