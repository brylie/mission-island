import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import type { Scene } from '@babylonjs/core/scene'

export type ParticleShape = 'mist' | 'flame' | 'smoke' | 'drop' | 'streak' | 'leaf' | 'mote'
  | 'foam' | 'ring' | 'crescent' | 'bubble' | 'bead' | 'parachute' | 'clod' | 'feather' | 'sole' | 'moth' | 'bee' | 'petal'
export const particleTextureSize = 48

const clamp = (value: number) => Math.min(1, Math.max(0, value))

function fiber(shape: 'parachute' | 'feather', u: number, v: number) {
  if (shape === 'parachute') {
    const crown = Math.abs(v + .47 - u * u * .5)
    const spokes = Math.cos(Math.atan2(u, -v + .48) * 27) ** 6
    const tuft = clamp((.85 - Math.abs(u)) * 17) * clamp(1 - crown * 7) * (.32 + spokes * .68)
    const stem = clamp(1 - Math.abs(u) * 15) * (v > -.43 && v < .62 ? .73 : 0)
    const seed = clamp(1 - Math.hypot(u * 10, (v - .65) * 5.8))
    return [Math.max(tuft, stem, seed), v > .46 ? 185 : 248]
  }
  const bend = u + .22 * Math.sin((v + .5) * 2.5)
  const width = .54 * Math.max(0, 1 - v * v) ** 1.55 * (1 - v * .28)
  const rim = clamp((width - Math.abs(bend)) * 13)
  const breaks = .63 + .37 * Math.abs(Math.sin(v * 31 - Math.abs(bend) * 13))
  const shaft = clamp(1 - Math.abs(bend) * 18) * clamp((.95 - Math.abs(v)) * 10)
  return [Math.max(rim * breaks, shaft), Math.abs(bend) < .05 ? 181 : 247]
}

function wetShape(shape: 'foam' | 'ring' | 'crescent' | 'bubble' | 'bead', u: number, v: number, radius: number, wobble: number) {
  switch (shape) {
    case 'foam':
      return [clamp((.88 - radius + .15 * wobble) * 6) * (.48 + .49 * Math.abs(wobble)), 251]
    case 'ring':
      return [clamp(1 - Math.abs(radius - .73) * 13) * (.76 + .24 * wobble), 255]
    case 'crescent': {
      const outer = clamp(1 - Math.abs(radius - .71) * 14)
      return [outer * clamp((v + .11) * 2.45), 251]
    }
    case 'bubble': {
      const rim = clamp(1 - Math.abs(radius - .72) * 11) * .74
      const glint = clamp(1 - Math.hypot(u + .33, v + .44) * 5.2)
      return [Math.max(rim, glint), 254]
    }
    case 'bead': {
      const rim = clamp(1 - Math.abs(radius - .65) * 10) * .56
      const glint = clamp(1 - Math.hypot(u + .24, v + .35) * 4.2)
      return [Math.max(rim, glint, clamp(.68 - radius) * .43), 252]
    }
  }
}

function wingedShape(shape: 'bee' | 'moth', u: number, v: number) {
  const side = Math.abs(u)
  const body = clamp(1 - Math.hypot(u * 4.4, v * 1.46) ** 2)
  const wing = clamp(1 - Math.hypot((side - .47) * 2.38, (v + side * .33) * 2.38) ** 1.3)
  const stripe = shape === 'bee' ? 142 + 106 * Math.abs(Math.sin(v * 8)) : 224
  return [Math.max(body, wing * (shape === 'bee' ? .64 : .91)), body > .38 ? stripe : 252]
}

function footprintShape(u: number, v: number) {
  const toe = clamp((.89 - Math.hypot(u * 1.07, (v - .27) * 1.45)) * 5)
  const heel = clamp((.57 - Math.hypot(u * 1.44, (v + .49) * 1.56)) * 6)
  const tread = Math.abs(Math.sin(v * 24 + Math.abs(u) * 4))
  return [Math.max(toe, heel) * (.62 + .38 * tread), 255]
}

function shadeParticle(shape: ParticleShape, u: number, v: number) {
  const radius = Math.hypot(u, v)
  const wobble = Math.sin(u * 14 + v * 7) * Math.cos(u * 9 - v * 13)
  switch (shape) {
    case 'flame': {
      const bend = Math.hypot((u + .11 * Math.sin(v * 5)) * (1.3 - v * .45), v)
      return [Math.max(0, 1 - bend * bend + wobble * .085) ** 2, 255]
    }
    case 'smoke':
      return [Math.max(0, 1 - radius * radius + wobble * .16) ** 2, 255]
    case 'leaf':
      return [clamp((.88 - Math.abs(u) - Math.abs(v) ** 1.35) * 16), Math.abs(u) < .065 ? 165 : 218 + 33 * Math.sin(u * 3 + v * 8) ** 2]
    case 'drop':
      return [clamp((.91 - Math.hypot(u * (1 + v * .36), v)) * 6), 215 + 40 * Math.max(0, 1 - Math.hypot(u + .25, v - .18) * 2)]
    case 'streak':
      return [Math.max(0, 1 - Math.abs(u)) * Math.max(0, 1 - Math.abs(v)) ** .65, 255]
    case 'mote':
      return [Math.max(0, 1 - radius) ** .8, 255]
    case 'moth':
    case 'bee':
      return wingedShape(shape, u, v)
    case 'sole':
      return footprintShape(u, v)
    case 'petal': {
      const curl = u + .18 * Math.sin(v * 4)
      return [clamp((.79 - Math.hypot(curl * (1.4 - v * .37), v)) * 12), 229 + 26 * (1 - v * v)]
    }
    case 'clod':
      return [clamp((.8 - Math.max(Math.abs(u), Math.abs(v) * 1.21, Math.abs(u + v) * .82) + wobble * .1) * 11), 220 + 31 * wobble]
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
      return [Math.max(0, 1 - radius * radius) ** 2, 255]
  }
}

export function createParticleTexture(scene: Scene, shape: ParticleShape) {
  const size = particleTextureSize
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + .5 - size / 2) / (size / 2)
      const v = (y + .5 - size / 2) / (size / 2)
      const [alpha, shade] = shadeParticle(shape, u, v)
      pixels.set([shade, shade, shade, Math.round(255 * Math.min(1, alpha))], (y * size + x) * 4)
    }
  }
  return RawTexture.CreateRGBATexture(pixels, size, size, scene, false)
}
