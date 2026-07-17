import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const sourceSvg = path.join(publicDir, 'pwa-icon.svg')

const pngSizes = [192, 512]
const faviconSizes = [16, 32, 48]

async function rasterize(svgBuffer, size) {
  return sharp(svgBuffer, { density: Math.max(72, size) })
    .resize(size, size)
    .png()
    .toBuffer()
}

async function main() {
  const svgBuffer = await readFile(sourceSvg)

  for (const size of pngSizes) {
    const out = path.join(publicDir, `pwa-${size}.png`)
    await sharp(svgBuffer, { density: Math.max(72, size) })
      .resize(size, size)
      .png()
      .toFile(out)
    console.log(`wrote ${path.relative(root, out)}`)
  }

  const faviconBuffers = await Promise.all(
    faviconSizes.map((size) => rasterize(svgBuffer, size)),
  )
  const icoPath = path.join(publicDir, 'favicon.ico')
  await writeFile(icoPath, await toIco(faviconBuffers))
  console.log(`wrote ${path.relative(root, icoPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
