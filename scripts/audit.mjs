import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const root = process.cwd()
const output = `${root}/output/lighthouse`
const profiles = [
  { name: 'desktop', config: 'lighthouse.config.cjs' },
  { name: 'mobile', config: 'lighthouse.mobile.config.cjs' },
]
const pages = [
  { name: 'home', url: 'http://127.0.0.1:4173/' },
  { name: 'detail', url: 'http://127.0.0.1:4173/nft/sage-009' },
]

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, shell: process.platform === 'win32', stdio: 'inherit' })
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} falhou (${code})`)))
  })
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:4173/')).ok) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('O preview não iniciou a tempo.')
}

await mkdir(output, { recursive: true })
await run('npm', ['run', 'build'])
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], { cwd: root, shell: process.platform === 'win32', stdio: 'ignore' })
try {
  await waitForPreview()
  const results = []
  for (const profile of profiles) for (const page of pages) for (let runNumber = 1; runNumber <= 3; runNumber += 1) {
    const report = `${output}/${profile.name}-${page.name}-${runNumber}`
    await run('npx', ['lighthouse', page.url, '--config-path', `./${profile.config}`, '--output', 'html', '--output', 'json', '--output-path', report, '--chrome-flags=--headless=new'])
    const data = JSON.parse(await readFile(`${report}.report.json`, 'utf8'))
    results.push({ profile: profile.name, page: page.name, run: runNumber, performance: data.categories.performance.score * 100, accessibility: data.categories.accessibility.score * 100, bestPractices: data.categories['best-practices'].score * 100, seo: data.categories.seo.score * 100, lcp: data.audits['largest-contentful-paint'].numericValue, cls: data.audits['cumulative-layout-shift'].numericValue, tbt: data.audits['total-blocking-time'].numericValue })
  }
  const median = (values) => [...values].sort((a, b) => a - b)[1]
  const summary = Object.fromEntries(profiles.flatMap((profile) => pages.map((page) => {
    const group = results.filter((result) => result.profile === profile.name && result.page === page.name)
    return [`${profile.name}-${page.name}`, Object.fromEntries(['performance', 'accessibility', 'bestPractices', 'seo', 'lcp', 'cls', 'tbt'].map((metric) => [metric, median(group.map((result) => result[metric]))]))]
  })))
  await writeFile(`${output}/summary.json`, JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2))
} finally {
  preview.kill()
}
