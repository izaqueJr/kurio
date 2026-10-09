// Auditoria Lighthouse: início e detalhe do NFT, perfis mobile e desktop, 3 execuções cada.
// Usa o build otimizado (vite build + preview) com o cenário padrão dos mocks.
// Saída versionada em reports/lighthouse/ (HTML + JSON por execução, summary.json e SUMMARY.md).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import { existsSync } from 'node:fs'
import { chromium } from '@playwright/test'

// Sem Chrome instalado, usa o Chromium do Playwright (npx playwright install chromium).
if (!process.env.CHROME_PATH) {
  const bundled = chromium.executablePath()
  const systemChrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => existsSync(path))
  if (!systemChrome && existsSync(bundled)) process.env.CHROME_PATH = bundled
}

const root = process.cwd()
const output = `${root}/reports/lighthouse`
const base = 'http://127.0.0.1:4173'
const profiles = [
  { name: 'desktop', config: 'lighthouse.config.cjs' },
  { name: 'mobile', config: 'lighthouse.mobile.config.cjs' },
]
const pages = [
  { name: 'home', url: `${base}/` },
  { name: 'detail', url: `${base}/nft/sage-009` },
]
const RUNS = 3
const targets = { performance: 90, accessibility: 95, bestPractices: 95, seo: 90 }

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, shell: process.platform === 'win32', stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} falhou (${code})`))))
  })
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${base}/`)).ok) return } catch { /* aguardando */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('O preview não iniciou a tempo.')
}

const version = (command) => { try { return execSync(command, { cwd: root }).toString().trim() } catch { return 'desconhecida' } }

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await run('npm', ['run', 'build'])
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: root, shell: process.platform === 'win32', stdio: 'ignore' })
const results = []
let lighthouseVersion = 'desconhecida'
let chromeVersion = 'desconhecida'
try {
  await waitForPreview()
  for (const profile of profiles) {
    for (const page of pages) {
      for (let runNumber = 1; runNumber <= RUNS; runNumber += 1) {
        const report = `${output}/${profile.name}-${page.name}-${runNumber}`
        await run('npx', ['lighthouse', page.url, '--config-path', `./${profile.config}`, '--output', 'html', '--output', 'json', '--output-path', report, '--chrome-flags=--headless=new', '--quiet'])
        const data = JSON.parse(await readFile(`${report}.report.json`, 'utf8'))
        lighthouseVersion = data.lighthouseVersion
        chromeVersion = data.environment?.hostUserAgent?.match(/Chrome\/[\d.]+/)?.[0] ?? chromeVersion
        results.push({
          profile: profile.name,
          page: page.name,
          run: runNumber,
          performance: Math.round(data.categories.performance.score * 100),
          accessibility: Math.round(data.categories.accessibility.score * 100),
          bestPractices: Math.round(data.categories['best-practices'].score * 100),
          seo: Math.round(data.categories.seo.score * 100),
          lcp: Math.round(data.audits['largest-contentful-paint'].numericValue),
          cls: Number(data.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
          tbt: Math.round(data.audits['total-blocking-time'].numericValue),
        })
      }
    }
  }
} finally {
  // No Windows o processo sobe via shell: é preciso encerrar a árvore inteira para liberar a porta.
  if (process.platform === 'win32') execSync(`taskkill /pid ${preview.pid} /T /F`, { stdio: 'ignore' })
  else preview.kill()
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const metrics = ['performance', 'accessibility', 'bestPractices', 'seo', 'lcp', 'cls', 'tbt']
const summary = Object.fromEntries(profiles.flatMap((profile) => pages.map((page) => {
  const group = results.filter((result) => result.profile === profile.name && result.page === page.name)
  return [`${profile.name}-${page.name}`, Object.fromEntries(metrics.map((metric) => [metric, median(group.map((result) => result[metric]))]))]
})))
const environment = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  lighthouse: lighthouseVersion,
  chrome: chromeVersion,
  vite: version('npx vite --version'),
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model ?? 'desconhecida',
  conditions: 'Build de produção (vite build + preview em 127.0.0.1:4173), MSW ativo no cenário padrão, Chrome headless, throttling padrão do Lighthouse para cada formFactor, 3 execuções por página e perfil (mediana).',
}
await writeFile(`${output}/summary.json`, JSON.stringify({ environment, targets, summary, results }, null, 2))

const row = (key, value) => {
  const ok = (metric) => (targets[metric] === undefined ? '' : value[metric] >= targets[metric] ? ' ✅' : ' ⚠️')
  return `| ${key} | ${value.performance}${ok('performance')} | ${value.accessibility}${ok('accessibility')} | ${value.bestPractices}${ok('bestPractices')} | ${value.seo}${ok('seo')} | ${(value.lcp / 1000).toFixed(2)} s | ${value.cls} | ${value.tbt} ms |`
}
const markdown = `# Auditoria Lighthouse

Gerado em ${environment.generatedAt}. Mediana de ${RUNS} execuções por página e perfil.

| Página / perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
${Object.entries(summary).map(([key, value]) => row(key, value)).join('\n')}

Metas: Performance ≥ ${targets.performance}, Accessibility ≥ ${targets.accessibility}, Best Practices ≥ ${targets.bestPractices}, SEO ≥ ${targets.seo}.

## Ambiente

- Lighthouse: ${environment.lighthouse}
- Navegador: ${environment.chrome}
- Node.js: ${environment.node}
- Vite: ${environment.vite}
- Sistema: ${environment.os}
- CPU: ${environment.cpu}
- Condições: ${environment.conditions}

Relatórios individuais: \`<perfil>-<página>-<execução>.report.html\` / \`.report.json\` nesta pasta.
`
await writeFile(`${output}/SUMMARY.md`, markdown)
console.log(markdown)
