import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import type { Scene } from '@babylonjs/core/scene'

export function createParticleTexture(scene: Scene, shape: 'mist' | 'flame' | 'smoke') {
  const size = 48
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5 - size / 2) / (size / 2)
      const v = (y + 0.5 - size / 2) / (size / 2)
      const wobble = Math.sin(u * 14 + v * 7) * Math.cos(u * 9 - v * 13)
      const radius = shape === 'flame'
        ? Math.hypot((u + 0.11 * Math.sin(v * 5)) * (1.3 - v * 0.45), v)
        : Math.hypot(u, v)
      const edge = shape === 'mist' ? 0 : wobble * (shape === 'smoke' ? 0.16 : 0.085)
      const alpha = Math.min(1, Math.max(0, 1 - radius * radius + edge) ** 2)
      pixels.set([255, 255, 255, Math.round(255 * alpha)], (y * size + x) * 4)
    }
  }
  return RawTexture.CreateRGBATexture(pixels, size, size, scene)
}
