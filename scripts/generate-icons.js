import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svg = readFileSync(resolve(root, 'public/icon.svg'))

for (const size of [16, 32, 48, 128, 512]) {
  await sharp(svg).resize(size, size).png().toFile(resolve(root, `public/icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}
console.log('All icons generated.')
