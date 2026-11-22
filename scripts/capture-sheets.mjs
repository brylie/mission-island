import { Buffer } from 'node:buffer'
import { readFileSync, writeFileSync } from 'node:fs'
import { contactSheet, differenceHeatmap } from '../src/assets/recipes/capture-presets.ts'

// Image work runs in the Playwright page: decode PNGs, compose sheets and diff pixels on a canvas.
// This keeps the CLI free of native image libraries.

const dataUrl = (path) => 'data:image/png;base64,' + readFileSync(path).toString('base64')
const writeDataUrl = (path, url) => writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'))

// Lays tiles out in rows. Each tile is { path, label }; a missing path leaves a gap.
export async function writeSheet(page, rows, out, columns) {
  const tiles = rows.map((tile) => tile && { label: tile.label, src: tile.path && dataUrl(tile.path) })
  const url = await page.evaluate(async ({ tiles, columns, look }) => {
    const images = await Promise.all(tiles.map((tile) => new Promise((resolve) => {
      if (!tile?.src) {
        resolve(undefined)
        return
      }
      const image = new globalThis.Image()
      image.onload = () => resolve(image)
      image.src = tile.src
    })))
    const sample = images.find(Boolean)
    const width = look.thumbWidth, height = sample ? Math.round(width * sample.height / sample.width) : width
    const cellHeight = height + look.labelHeight
    const rowsCount = Math.ceil(tiles.length / columns)
    const canvas = Object.assign(globalThis.document.createElement('canvas'), { width: columns * (width + look.gap) + look.gap, height: rowsCount * (cellHeight + look.gap) + look.gap })
    const context = canvas.getContext('2d')
    context.fillStyle = look.background
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.font = '13px system-ui, sans-serif'
    tiles.forEach((tile, index) => {
      const x = look.gap + (index % columns) * (width + look.gap), y = look.gap + Math.floor(index / columns) * (cellHeight + look.gap)
      if (images[index]) context.drawImage(images[index], x, y + look.labelHeight, width, height)
      context.fillStyle = look.label
      context.fillText(tile?.label ?? '', x + look.labelInset, y + look.labelHeight - look.labelInset, width - look.labelInset - look.labelInset)
    })
    return canvas.toDataURL('image/png')
  }, { tiles, columns, look: contactSheet })
  writeDataUrl(out, url)
}

// Writes a heatmap of per-pixel difference and returns the share of pixels that changed and the mean difference.
export async function writeDifference(page, before, after, out) {
  const result = await page.evaluate(async ({ a, b, look }) => {
    const load = (src) => new Promise((resolve) => {
      const image = new globalThis.Image()
      image.onload = () => resolve(image)
      image.src = src
    })
    const [first, second] = await Promise.all([load(a), load(b)])
    const width = Math.min(first.width, second.width), height = Math.min(first.height, second.height)
    const read = (image) => {
      const canvas = Object.assign(globalThis.document.createElement('canvas'), { width, height })
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, width, height)
      return { canvas, context, pixels: context.getImageData(0, 0, width, height) }
    }
    const left = read(first), right = read(second)
    const heat = left.context.createImageData(width, height)
    let changed = 0, total = 0
    for (let i = 0; i < heat.data.length; i += look.rgbaStride) {
      let delta = 0, grey = 0
      for (let channel = 0; channel < look.rgbChannels; channel++) {
        delta += Math.abs(left.pixels.data[i + channel] - right.pixels.data[i + channel]) / look.rgbChannels
        grey += right.pixels.data[i + channel] / look.rgbChannels * look.backgroundShade
      }
      total += delta
      if (delta > look.changeThreshold) changed++
      heat.data.set([Math.min(look.channelMax, grey + delta * look.gain), grey, grey, look.channelMax], i)
    }
    left.context.putImageData(heat, 0, 0)
    const pixels = width * height
    return { url: left.canvas.toDataURL('image/png'), changedShare: changed / pixels, meanDifference: total / pixels / look.channelMax }
  }, { a: dataUrl(before), b: dataUrl(after), look: differenceHeatmap })
  writeDataUrl(out, result.url)
  return { changedShare: Number(result.changedShare.toFixed(differenceHeatmap.decimals)), meanDifference: Number(result.meanDifference.toFixed(differenceHeatmap.decimals)) }
}
