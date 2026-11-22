import { saltwindLandscapePalette as palette } from '../assets/geometry/saltwind-landscape'
import { habitatColor } from './habitats'
import { ferryTrack, fishingPier, routes } from './routes'
import { biomes, landmarks, runway, discoveryWalks, villages, waterBounds } from './sites'
import type { MapPoint } from './sites'
import { groundHeight, waterHeight } from './terrain'

const { minX, maxX, minZ, maxZ } = waterBounds
const chartPixelWidth = 340
const chartPixelHeight = 255
const channelsPerPixel = 4
const opaqueAlpha = 255
const deepWaterCutoff = -3.1
const contourInterval = 8
const contourSampleX = 3
const contourSampleZ = 2
const contourShade = 0.89
const mainRoadWidth = 8
const mainRoadStroke = 2.6
const laneStroke = 2
const roadStrokeInset = 1.15
const runwayStroke = 5.2
const half = 0.5
const fullTurn = Math.PI + Math.PI
const eighthTurn = Math.PI * half * half

const trailStroke = 1.6
const biomeOutline = 2
const scaleLengthMetres = 100
const scaleMarginLeft = 24
const scaleMarginBottom = 22
const scaleTickHeight = 5
const scaleLabelGap = 7
const scaleStroke = 2
const northMarginRight = 29
const northBaseline = 25
const focusedPinRadius = 7.4
const detailedPinRadius = 3.6
const compactPinRadius = 3.3
const focusedPinOutline = 2.4
const villageLabelOffset = 21
const villageLabelOutline = 3
const freightPinSize = 10
const freightPinInset = -freightPinSize * half
const freightPinOutline = 2
const detailedPlayerRadius = 5.8
const compactPlayerRadius = 5.2
const playerOutline = 2.2

const scale = (p: MapPoint, canvas: HTMLCanvasElement) => ({
  x: (p.x - minX) / (maxX - minX) * canvas.width,
  z: (maxZ - p.z) / (maxZ - minZ) * canvas.height,
})

export function createChart(canvas: HTMLCanvasElement, detailed: boolean) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The site map requires a 2D canvas.')
  const chart = document.createElement('canvas')
  chart.width = chartPixelWidth
  chart.height = chartPixelHeight
  const base = chart.getContext('2d')
  if (!base) throw new Error('The site map requires a 2D canvas.')
  const image = base.createImageData(chart.width, chart.height)
  for (let py = 0; py < chart.height; py++) for (let px = 0; px < chart.width; px++) {
    const x = minX + (maxX - minX) * px / chart.width, z = maxZ - (maxZ - minZ) * py / chart.height
    const y = groundHeight(x, z), water = waterHeight(x, z)
    const color = y <= water
      ? (water > 0 || y > deepWaterCutoff ? palette.shoal : palette.sea)
      : habitatColor(x, y, z)
    const contour = y > water && Math.floor(y / contourInterval)
      !== Math.floor(groundHeight(x + contourSampleX, z + contourSampleZ) / contourInterval)
      ? contourShade
      : 1
    const [red, green, blue] = color
    image.data.set([red * contour, green * contour, blue * contour, opaqueAlpha], (py * chart.width + px) * channelsPerPixel)
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
    base.lineWidth = route.width > mainRoadWidth ? mainRoadStroke : laneStroke
    base.strokeStyle = '#566458'
    base.stroke()
    base.lineWidth -= roadStrokeInset
    base.strokeStyle = '#f5dbab'
    base.stroke()
  }
  const start = scale({ x: runway.x - runway.length * half, z: runway.z }, chart)
  base.fillStyle = '#656e62'
  base.fillRect(start.x, start.z - runwayStroke * half, runway.length / (maxX - minX) * chart.width, runwayStroke)

  return (player: MapPoint, known: Set<string>, selected?: string, freight?: MapPoint) => {
    context.drawImage(chart, 0, 0, canvas.width, canvas.height)
    for (const walk of discoveryWalks) {
      if (!detailed || !known.has(walk.id)) continue
      context.beginPath()
      walk.path.forEach((point, i) => {
        const p = scale(point, canvas)
        if (i === 0) context.moveTo(p.x, p.z)
        else context.lineTo(p.x, p.z)
      })
      context.lineWidth = trailStroke
      context.strokeStyle = '#f3e0af'
      context.stroke()
    }
    if (detailed) {
      context.fillStyle = '#304f47'
      context.font = 'italic 600 15px Georgia, serif'
      context.textAlign = 'center'
      for (const biome of biomes) {
        const p = scale(biome, canvas)
        context.strokeStyle = '#f6ebbd'
        context.lineWidth = biomeOutline
        context.strokeText(biome.name, p.x, p.z)
        context.fillText(biome.name, p.x, p.z)
      }
      context.beginPath()
      const sx = scaleMarginLeft, sy = canvas.height - scaleMarginBottom, width = scaleLengthMetres / (maxX - minX) * canvas.width
      context.strokeStyle = '#fce8c3'
      context.lineWidth = scaleStroke
      context.moveTo(sx, sy - scaleTickHeight)
      context.lineTo(sx, sy)
      context.lineTo(sx + width, sy)
      context.lineTo(sx + width, sy - scaleTickHeight)
      context.stroke()
      context.fillStyle = '#fff0d6'
      context.font = '13px system-ui'
      context.fillText(`${scaleLengthMetres} m`, sx + width * half, sy - scaleLabelGap)
      context.fillText('▲ N', canvas.width - northMarginRight, northBaseline)
    }
    for (const landmark of landmarks) {
      if ((!detailed || landmark.discoverable) && !known.has(landmark.id)) continue
      const at = scale(landmark, canvas)
      const focus = selected === landmark.id
      const pin = focus ? focusedPinRadius : detailed ? detailedPinRadius : compactPinRadius
      context.beginPath()
      context.arc(at.x, at.z, pin, 0, fullTurn)
      context.fillStyle = focus ? '#e39154' : known.has(landmark.id) ? '#f7c872' : '#557064'
      context.fill()
      context.strokeStyle = focus ? '#fff0c5' : '#2f4946'
      context.lineWidth = focus ? focusedPinOutline : 1
      context.stroke()
    }
    if (detailed) for (const village of villages) {
      const p = scale(village, canvas)
      context.font = '750 14px system-ui'
      context.textAlign = 'center'
      context.lineWidth = villageLabelOutline
      context.strokeStyle = '#304a3e'
      context.fillStyle = '#fff1d4'
      context.strokeText(village.name, p.x, p.z + villageLabelOffset)
      context.fillText(village.name, p.x, p.z + villageLabelOffset)
    }
    if (freight) {
      const pin = scale(freight, canvas)
      context.save()
      context.translate(pin.x, pin.z)
      context.rotate(eighthTurn)
      context.fillStyle = '#e79440'
      context.strokeStyle = '#302e27'
      context.lineWidth = freightPinOutline
      context.fillRect(freightPinInset, freightPinInset, freightPinSize, freightPinSize)
      context.strokeRect(freightPinInset, freightPinInset, freightPinSize, freightPinSize)
      context.restore()
    }
    const at = scale(player, canvas)
    context.beginPath()
    context.arc(at.x, at.z, detailed ? detailedPlayerRadius : compactPlayerRadius, 0, fullTurn)
    context.fillStyle = '#fff4d7'
    context.fill()
    context.strokeStyle = '#2b5d69'
    context.lineWidth = playerOutline
    context.stroke()
  }
}
