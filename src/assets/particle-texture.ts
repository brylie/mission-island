import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import type { Scene } from '@babylonjs/core/scene'
import { fiberShapes, particleShapes, soleShape, textureWobble, wetShapes, wingedShapes } from './effects/particle-shapes'

export type ParticleShape = 'mist' | 'flame' | 'smoke' | 'drop' | 'streak' | 'leaf' | 'mote'
  | 'foam' | 'ring' | 'crescent' | 'bubble' | 'bead' | 'parachute' | 'clod' | 'feather' | 'sole' | 'moth' | 'bee' | 'petal'
export const particleTextureSize = 48

type Texel = readonly [opacity: number, luminance: number]

const pixelCenterOffset = 0.5
const half = 0.5
const channelsPerPixel = 4
const maxByte = 255
const squarePower = 2
const clamp = (value: number) => Math.min(1, Math.max(0, value))

function fiber(shape: 'parachute' | 'feather', u: number, v: number): Texel {
  if (shape === 'parachute') {
    const { crown, spokes, tuft, stem, seed, shade } = fiberShapes.parachute
    const fromCrown = Math.abs(v + crown.rise - u * u * crown.curvature)
    const spokesMask = Math.cos(Math.atan2(u, -v + spokes.originV) * spokes.count) ** spokes.sharpness
    const tuftMask = clamp((tuft.halfWidth - Math.abs(u)) * tuft.edgeFalloff)
      * clamp(1 - fromCrown * crown.falloff) * (spokes.baseOpacity + spokesMask * spokes.opacityVariation)
    const stemMask = clamp(1 - Math.abs(u) * stem.edgeFalloff) * (v > stem.startV && v < stem.endV ? stem.opacity : 0)
    const seedMask = clamp(1 - Math.hypot(u * seed.uScale, (v - seed.centerV) * seed.vScale))
    return [Math.max(tuftMask, stemMask, seedMask), v > seed.darkensAtV ? seed.shade : shade]
  }
  const { bend, vane, barbs, quill, shade } = fiberShapes.feather
  const bentU = u + bend.amount * Math.sin((v + bend.offsetV) * bend.frequency)
  const width = vane.halfWidth * Math.max(0, 1 - v * v) ** vane.taperPower * (1 - v * vane.tipTaper)
  const rim = clamp((width - Math.abs(bentU)) * vane.edgeFalloff)
  const breaks = barbs.baseOpacity + barbs.opacityVariation * Math.abs(Math.sin(v * barbs.frequencyV - Math.abs(bentU) * barbs.slant))
  const shaft = clamp(1 - Math.abs(bentU) * quill.lateralFalloff) * clamp((quill.halfLength - Math.abs(v)) * quill.endFalloff)
  return [Math.max(rim * breaks, shaft), Math.abs(bentU) < quill.stripeHalfWidth ? quill.shade : shade]
}

function radialBand(radius: number, band: { radius: number, falloff: number }) {
  return clamp(1 - Math.abs(radius - band.radius) * band.falloff)
}

function wetShape(shape: keyof typeof wetShapes, u: number, v: number, radius: number, wobble: number): Texel {
  switch (shape) {
    case 'foam': {
      const foam = wetShapes.foam
      const edge = clamp((foam.radius - radius + foam.edgeWobble * wobble) * foam.edgeFalloff)
      return [edge * (foam.baseOpacity + foam.opacityVariation * Math.abs(wobble)), foam.shade]
    }
    case 'ring': {
      const ring = wetShapes.ring
      return [radialBand(radius, ring.band) * (ring.baseOpacity + ring.opacityVariation * wobble), maxByte]
    }
    case 'crescent': {
      const crescent = wetShapes.crescent
      return [radialBand(radius, crescent.band) * clamp((v + crescent.maskOffsetV) * crescent.maskFalloff), crescent.shade]
    }
    case 'bubble': {
      const { band, rimOpacity, glint, shade } = wetShapes.bubble
      const rim = radialBand(radius, band) * rimOpacity
      const highlight = clamp(1 - Math.hypot(u - glint.centerU, v - glint.centerV) * glint.falloff)
      return [Math.max(rim, highlight), shade]
    }
    case 'bead': {
      const { band, rimOpacity, glint, core, shade } = wetShapes.bead
      const rim = radialBand(radius, band) * rimOpacity
      const highlight = clamp(1 - Math.hypot(u - glint.centerU, v - glint.centerV) * glint.falloff)
      return [Math.max(rim, highlight, clamp(core.radius - radius) * core.opacity), shade]
    }
  }
}

function wingedShape(shape: 'bee' | 'moth', u: number, v: number): Texel {
  const { body, wing, bee, moth } = wingedShapes
  const side = Math.abs(u)
  const bodyMask = clamp(1 - Math.hypot(u * body.uScale, v * body.vScale) ** squarePower)
  const wingMask = clamp(1 - Math.hypot((side - wing.centerU) * wing.scale, (v + side * wing.slant) * wing.scale) ** wing.featherPower)
  const stripe = shape === 'bee' ? bee.stripeBaseShade + bee.stripeShadeVariation * Math.abs(Math.sin(v * bee.stripeFrequency)) : moth.bodyShade
  return [Math.max(bodyMask, wingMask * wingedShapes[shape].wingOpacity), bodyMask > body.shadeThreshold ? stripe : wing.shade]
}

function footprintShape(u: number, v: number): Texel {
  const { toe, heel, tread } = soleShape
  const toeMask = clamp((toe.radius - Math.hypot(u * toe.uScale, (v - toe.centerV) * toe.vScale)) * toe.falloff)
  const heelMask = clamp((heel.radius - Math.hypot(u * heel.uScale, (v - heel.centerV) * heel.vScale)) * heel.falloff)
  const grooves = Math.abs(Math.sin(v * tread.frequencyV + Math.abs(u) * tread.curveU))
  return [Math.max(toeMask, heelMask) * (tread.baseOpacity + tread.opacityVariation * grooves), maxByte]
}

function shadeParticle(shape: ParticleShape, u: number, v: number): Texel {
  const radius = Math.hypot(u, v)
  const { sineU, sineV, cosineU, cosineV } = textureWobble
  const wobble = Math.sin(u * sineU + v * sineV) * Math.cos(u * cosineU - v * cosineV)
  switch (shape) {
    case 'flame': {
      const flame = particleShapes.flame
      const bentRadius = Math.hypot((u + flame.bend * Math.sin(v * flame.bendFrequency)) * (flame.width - v * flame.tipTaper), v)
      return [Math.max(0, 1 - bentRadius * bentRadius + wobble * flame.edgeWobble) ** squarePower, maxByte]
    }
    case 'smoke':
      return [Math.max(0, 1 - radius * radius + wobble * particleShapes.smoke.edgeWobble) ** squarePower, maxByte]
    case 'leaf': {
      const { radius: spread, tipPower, edgeFalloff, vein, blade } = particleShapes.leaf
      const mask = clamp((spread - Math.abs(u) - Math.abs(v) ** tipPower) * edgeFalloff)
      const shade = Math.abs(u) < vein.halfWidth
        ? vein.shade
        : blade.baseShade + blade.shadeVariation * Math.sin(u * blade.frequencyU + v * blade.frequencyV) ** squarePower
      return [mask, shade]
    }
    case 'drop': {
      const { radius: spread, taper, edgeFalloff, baseShade, glint } = particleShapes.drop
      const mask = clamp((spread - Math.hypot(u * (1 + v * taper), v)) * edgeFalloff)
      const highlight = Math.max(0, 1 - Math.hypot(u - glint.centerU, v - glint.centerV) * glint.falloff)
      return [mask, baseShade + glint.shadeVariation * highlight]
    }
    case 'streak':
      return [Math.max(0, 1 - Math.abs(u)) * Math.max(0, 1 - Math.abs(v)) ** particleShapes.streak.lengthFalloffPower, maxByte]
    case 'mote':
      return [Math.max(0, 1 - radius) ** particleShapes.mote.radialFalloffPower, maxByte]
    case 'moth':
    case 'bee':
      return wingedShape(shape, u, v)
    case 'sole':
      return footprintShape(u, v)
    case 'petal': {
      const petal = particleShapes.petal
      const curl = u + petal.curl * Math.sin(v * petal.curlFrequency)
      const mask = clamp((petal.radius - Math.hypot(curl * (petal.width - v * petal.tipTaper), v)) * petal.edgeFalloff)
      return [mask, petal.baseShade + petal.shadeVariation * (1 - v * v)]
    }
    case 'clod': {
      const clod = particleShapes.clod
      const distance = Math.max(Math.abs(u), Math.abs(v) * clod.vScale, Math.abs(u + v) * clod.diagonalScale)
      const mask = clamp((clod.radius - distance + wobble * clod.edgeWobble) * clod.edgeFalloff)
      return [mask, clod.baseShade + clod.shadeVariation * wobble]
    }
    case 'parachute':
    case 'feather':
      return fiber(shape, u, v)
    case 'foam':
    case 'ring':
    case 'crescent':
    case 'bubble':
    case 'bead':
      return wetShape(shape, u, v, radius, wobble)
    case 'mist':
      return [Math.max(0, 1 - radius * radius) ** squarePower, maxByte]
  }
}

export function createParticleTexture(scene: Scene, shape: ParticleShape) {
  const size = particleTextureSize
  const halfSize = size * half
  const pixels = new Uint8Array(size * size * channelsPerPixel)
  for (let y = 0; y < size; y++) {
    const v = (y + pixelCenterOffset - halfSize) / halfSize
    for (let x = 0; x < size; x++) {
      const u = (x + pixelCenterOffset - halfSize) / halfSize
      const [alpha, shade] = shadeParticle(shape, u, v)
      pixels.set([shade, shade, shade, Math.round(maxByte * Math.min(1, alpha))], (y * size + x) * channelsPerPixel)
    }
  }
  return RawTexture.CreateRGBATexture(pixels, size, size, scene, false)
}
