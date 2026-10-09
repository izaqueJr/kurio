// Gera derivados WebP dos assets do Figma (mesma arte, menor peso) usados pela interface.
// Os PNGs originais continuam em public/assets/figma/. Uso: node scripts/optimize-images.mjs
import sharp from 'sharp'
import { stat } from 'node:fs/promises'

const dir = 'public/assets/figma'
const jobs = [
  ...['ape-green', 'ape-purple', 'ape-gold', 'ape-dark'].map((name) => ({ name, width: 800 })),
  { name: 'hero-banner-mobile', width: 732 },
]

for (const { name, width } of jobs) {
  const input = `${dir}/${name}.png`
  const output = `${dir}/${name}.webp`
  await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(output)
  const [before, after] = await Promise.all([stat(input), stat(output)])
  console.log(`${name}: ${(before.size / 1024).toFixed(0)} KB → ${(after.size / 1024).toFixed(0)} KB`)
}
