import { palette } from './landscape'
import { ferryTrack, fishingPier, routes } from './routes'
import { biomes, landmarks, runway, villages, waterBounds } from './sites'
import type { MapPoint } from './sites'
import { groundHeight, waterHeight } from './terrain'

const { minX, maxX, minZ, maxZ } = waterBounds
const scale = (p: MapPoint, canvas: HTMLCanvasElement) => ({
  x: (p.x - minX) / (maxX - minX) * canvas.width,
  z: (maxZ - p.z) / (maxZ - minZ) * canvas.height,
})

export function createChart(canvas: HTMLCanvasElement, detailed: boolean) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The site map requires a 2D canvas.')
  const chart = document.createElement('canvas')
  chart.width = 340
  chart.height = 255
  const base = chart.getContext('2d')
  if (!base) throw new Error('The site map requires a 2D canvas.')
  const image = base.createImageData(chart.width, chart.height)
  for (let py = 0; py < chart.height; py++) for (let px = 0; px < chart.width; px++) {
    const x = minX + (maxX - minX) * px / chart.width, z = maxZ - (maxZ - minZ) * py / chart.height
    const y = groundHeight(x, z), water = waterHeight(x, z)
    const color = y <= water ? (water > 0 || y > -3.1 ? palette.shoal : palette.sea)
      : y < 7 ? palette.sand : y > 36 ? palette.upland : palette.grass
    const contour = y > water && Math.floor(y / 8) !== Math.floor(groundHeight(x + 3, z + 2) / 8) ? .89 : 1
    image.data.set([color[0] * contour, color[1] * contour, color[2] * contour, 255], (py * chart.width + px) * 4)
  }
  base.putImageData(image, 0, 0)
  base.lineJoin = 'round'
  for (const route of [...routes, ferryTrack, fishingPier]) {
    base.beginPath()
    route.samples.forEach((point, i) => {
      const p = scale(point, chart)
      if (i === 0) base.moveTo(p.x, p.z)
      else base.lineTo(p.x, p.z)
    })
    base.lineWidth = route.width > 8 ? 2.6 : 2
    base.strokeStyle = '#566458'
    base.stroke()
    base.lineWidth -= 1.15
    base.strokeStyle = '#f5dbab'
    base.stroke()
  }
  const start = scale({ x: runway.x - runway.length / 2, z: runway.z }, chart)
  base.fillStyle = '#656e62'
  base.fillRect(start.x, start.z - 2.6, runway.length / (maxX - minX) * chart.width, 5.2)

  return (player: MapPoint, known: Set<string>, selected?: string) => {
    context.drawImage(chart, 0, 0, canvas.width, canvas.height)
    if (detailed) {
      context.fillStyle = '#304f47'
      context.font = 'italic 15px Georgia, serif'
      context.textAlign = 'center'
      for (const biome of biomes) {
        const p = scale(biome, canvas)
        context.fillText(biome.name, p.x, p.z)
      }
      context.beginPath()
      const sx = 24, sy = canvas.height - 22, width = 100 / (maxX - minX) * canvas.width
      context.strokeStyle = '#fce8c3'
      context.lineWidth = 2
      context.moveTo(sx, sy - 5); context.lineTo(sx, sy); context.lineTo(sx + width, sy); context.lineTo(sx + width, sy - 5)
      context.stroke()
      context.fillStyle = '#fff0d6'
      context.font = '13px system-ui'
      context.fillText('100 m', sx + width / 2, sy - 7)
      context.fillText('▲ N', canvas.width - 29, 25)
    }
    for (const landmark of landmarks) {
      if (!detailed && !known.has(landmark.id)) continue
      const at = scale(landmark, canvas)
      const focus = selected === landmark.id
      const pin = focus ? 7.4 : detailed ? 3.6 : 3.3
      context.beginPath()
      context.arc(at.x, at.z, pin, 0, 2 * Math.PI)
      context.fillStyle = focus ? '#e39154' : known.has(landmark.id) ? '#f7c872' : '#557064'
      context.fill()
      context.strokeStyle = focus ? '#fff0c5' : '#2f4946'
      context.lineWidth = focus ? 2.4 : 1
      context.stroke()
    }
    if (detailed) for (const village of villages) {
      const p = scale(village, canvas)
      context.font = '750 14px system-ui'
      context.textAlign = 'center'
      context.lineWidth = 3
      context.strokeStyle = '#304a3e'
      context.fillStyle = '#fff1d4'
      context.strokeText(village.name, p.x, p.z + 21)
      context.fillText(village.name, p.x, p.z + 21)
    }
    const at = scale(player, canvas)
    context.beginPath()
    context.arc(at.x, at.z, detailed ? 5.8 : 5.2, 0, 2 * Math.PI)
    context.fillStyle = '#fff4d7'
    context.fill()
    context.strokeStyle = '#2b5d69'
    context.lineWidth = 2.2
    context.stroke()
  }
}
