import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import type { MarketRunoff } from './market-runoff'
import { market } from './farm'
import { createIslandMaterial } from './materials'
import { marketRainStyle, rainChainStream, runoffFilmLook, waterFilmQuad, waterFilmShader } from './assets/effects/market-water'
import { createMarketAwning } from './assets/market-awning'
import { clothHeight, gutterY, marketAwningSite } from './worlds/starter/market-awning'

type Position = { x: number, y: number, z: number }
const { back, hem, spout, splash, drain, gutterZ, catchHeight, grateHeight } = marketAwningSite

function waterFilm(meshes: MeshFactory, name: string, puddle: boolean) {
  const material = new ShaderMaterial(name, meshes.scene, waterFilmShader, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'amount', 'time', 'wetArea'], needAlphaBlending: true })
  material.backFaceCulling = false
  material.setFloat('wetArea', Number(puddle))
  return material
}

const quad = [...waterFilmQuad.indices]
const quadUV = [...waterFilmQuad.uv]
const half = 0.5
const minimumFilmAmount = 0.012
const minimumStreamAmount = 0.018
const firstDropThreshold = 0.11
const secondDropThreshold = 0.64
const streamDropThreshold = 0.42
const streamRingThreshold = 0.3
const secondDropCount = 2
const dropFallExponent = 2
const runoffViewDistance = 28
const runoffFadeDistance = 7

function flatFilm(meshes: MeshFactory, name: string, a: Position, b: Position, width: number, puddle: boolean) {
  const material = waterFilm(meshes, name, puddle)
  const length = Math.hypot(b.x - a.x, b.z - a.z)
  const doubledLength = length + length
  const dx = (b.z - a.z) * width / doubledLength
  const dz = (a.x - b.x) * width / doubledLength
  const mesh = meshes.surface(name, [
    a.x - dx,
    a.y,
    a.z - dz,
    b.x - dx,
    b.y,
    b.z - dz,
    a.x + dx,
    a.y,
    a.z + dz,
    b.x + dx,
    b.y,
    b.z + dz,
  ], quad, material, undefined, quadUV)
  mesh.setEnabled(false)
  return (amount: number, time: number) => {
    mesh.setEnabled(amount > minimumFilmAmount)
    material.setFloat('amount', amount)
    material.setFloat('time', time)
  }
}

function createStream(meshes: MeshFactory) {
  const material = waterFilm(meshes, 'Water spilling down the rain chain', false)
  const positions: number[] = [], indices: number[] = [], uv: number[] = []
  const { crossSections, sides, radius: startRadius, radiusGrowth, bend, xOffset, zOffset, minimumWidthScale, widthGain } = rainChainStream
  const verticesPerSection = sides + 1
  for (let level = 0; level < crossSections; level++) {
    const t = level / (crossSections - 1), radius = startRadius + radiusGrowth * t
    for (let i = 0; i <= sides; i++) {
      const angle = i * Math.PI / (sides * half), index = level * verticesPerSection + i
      positions.push(Math.sin(angle) * radius - bend * t, spout.y + (catchHeight - spout.y) * t, Math.cos(angle) * radius)
      uv.push(i / sides, t)
      const previous = index - verticesPerSection
      if (level && i) indices.push(previous - 1, previous, index - 1, previous, index, index - 1)
    }
  }
  const mesh = meshes.surface('Rain chain stream', positions, indices, material, undefined, uv)
  mesh.position.set(spout.x + xOffset, 0, spout.z + zOffset)
  mesh.setEnabled(false)
  return (amount: number, time: number) => {
    mesh.setEnabled(amount > minimumStreamAmount)
    const width = minimumWidthScale + widthGain * amount
    mesh.scaling.set(width, 1, width)
    material.setFloat('amount', amount)
    material.setFloat('time', time)
  }
}

function createDrops(meshes: MeshFactory) {
  const root = new TransformNode('Market rain droplets', meshes.scene)
  const material = createIslandMaterial(meshes.scene, 'Reflected sky on water drops', '#afd5d4', true)
  const splashWater = createIslandMaterial(meshes.scene, 'Water ripples', '#aad2ca', true)
  const { chainDrop, awningBead, splashRing, cycleSpeed, phaseStep } = marketRainStyle
  splashWater.alpha = splashRing.opacity
  const drops = Array.from({ length: chainDrop.count }, (_, i) =>
    meshes.sphere(spout.x + chainDrop.xOffset, 0, spout.z + chainDrop.zOffset + i * chainDrop.zStep, ...chainDrop.size, material, root, false))
  const beads = Array.from({ length: awningBead.count }, (_, i) => {
    const x = market.x + (Math.sin(i * awningBead.xFrequency) * half) * awningBead.xSpan
    const z = back.z + awningBead.zInset + (half + half * Math.sin(i * awningBead.zFrequency)) * awningBead.zSpan
    const mesh = meshes.sphere(x, 0, z, ...awningBead.size, material, root, false, awningBead.segments)
    return { mesh, y: clothHeight(z), phase: (i * awningBead.phaseStep) % 1 }
  })
  const verticesPerRingSegment = splashRing.radii.length
  const ringVertices = splashRing.segments * verticesPerRingSegment
  const rings = Array.from({ length: splashRing.count }, () => {
    const positions: number[] = [], indices: number[] = []
    for (let i = 0; i < splashRing.segments; i++) {
      const angle = i * Math.PI / (splashRing.segments * half)
      for (const radius of splashRing.radii) positions.push(radius * Math.cos(angle), 0, radius * Math.sin(angle))
      const a = i * verticesPerRingSegment, b = (a + verticesPerRingSegment) % ringVertices
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
    return meshes.surface('Splash ring', positions, indices, splashWater, root)
  })
  return (time: number, state: MarketRunoff) => {
    const rhythm = time * cycleSpeed
    drops.forEach((mesh, i) => {
      const progress = (rhythm + i * phaseStep) % 1
      mesh.setEnabled(progress < chainDrop.visibleUntil && ((i === 0 && state.drip > firstDropThreshold) || (i < secondDropCount && state.drip > secondDropThreshold) || state.stream > streamDropThreshold))
      mesh.position.y = spout.y - (spout.y - catchHeight) * progress ** dropFallExponent
    })
    for (const { mesh, y, phase } of beads) {
      const strike = (time * awningBead.cycleSpeed + phase) % 1
      mesh.setEnabled(strike < awningBead.visibleFraction * state.rain)
      mesh.position.y = y + awningBead.baseLift + strike * awningBead.rise
    }
    rings.forEach((ring, i) => {
      const spread = (rhythm + i * phaseStep + splashRing.phaseOffset) % 1
      ring.setEnabled(spread < splashRing.visibleUntil && i < (state.stream > streamRingThreshold ? splashRing.count : state.drip > firstDropThreshold ? 1 : 0))
      ring.position.set(splash.x + splashRing.xOffset, catchHeight + splashRing.yOffset - i * splashRing.layerDepth, splash.z + splashRing.zOffset)
      const radius = splashRing.startRadius + splashRing.radiusGrowth * spread
      ring.scaling.set(radius, 1, radius * splashRing.depthScale)
    })
  }
}

export function createMarketShower(meshes: MeshFactory) {
  const wetCloth = createMarketAwning(meshes)
  const stream = createStream(meshes)
  const droplets = createDrops(meshes)
  const { puddle, gutter: gutterLook, trickle: trickleLook } = runoffFilmLook
  const patch = flatFilm(
    meshes,
    'Pooled water beside the market path',
    { ...splash, y: catchHeight + puddle.startRise, z: splash.z + puddle.startZ },
    { ...splash, y: catchHeight + puddle.endRise, z: splash.z + puddle.endZ },
    puddle.width,
    true,
  )
  const gutterStart = market.x + gutterLook.startX, gutterEnd = spout.x + gutterLook.endX
  const gutter = flatFilm(
    meshes,
    'Water in the sloped gutter',
    { x: gutterStart, y: gutterY(gutterStart) + gutterLook.startRise, z: gutterZ },
    { x: gutterEnd, y: gutterY(gutterEnd) + gutterLook.endRise, z: gutterZ },
    gutterLook.width,
    false,
  )
  const trickle = flatFilm(
    meshes,
    'Water running to the grate',
    { ...splash, y: catchHeight + trickleLook.startRise },
    { ...drain, y: grateHeight + trickleLook.endRise, z: drain.z + trickleLook.endZ },
    trickleLook.width,
    false,
  )
  let canvasWetness = 0
  return (time: number, camera: Position, state: MarketRunoff) => {
    const distance = Math.hypot(camera.x - market.x, camera.y - hem.y, camera.z - market.z)
    const nearby = Math.max(0, Math.min(1, (runoffViewDistance - distance) / runoffFadeDistance))
    if (canvasWetness !== state.canvas) {
      canvasWetness = state.canvas
      wetCloth(canvasWetness)
    }
    stream(state.stream * nearby, time)
    patch(state.puddle * nearby, time)
    gutter(state.stream * nearby * gutterLook.opacity, time)
    trickle(Math.max(state.stream, state.drip * trickleLook.dripContribution) * nearby, time)
    droplets(time, { ...state, rain: state.rain * nearby, stream: state.stream * nearby, drip: state.drip * nearby })
  }
}
