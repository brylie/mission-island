import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { liftSites, liftStrength, type LiftSite } from '../worlds/starter/lift'

// Rising motes show where air lifts a wing: lilac over windward slopes, warm gold over sun-warmed
// ground. A thermal's motes thin out as the sun drops or rain cools the ground, and vanish at night.
const colors = { ridge: '#d4c2ff', thermal: '#ffd9a0' }

function createLiftColumn({ scene, sphere, paint }: MeshFactory, site: LiftSite) {
  const root = new TransformNode(`${site.name} lift`, scene)
  root.position.set(site.x, groundHeight(site), site.z)
  const material = paint(colors[site.kind], true)
  const motes = Array.from({ length: 28 }, (_, index) => {
    const mesh = sphere(0, 0, 0, 0.14, 0.48, 0.14, material, root, false, 4)
    const orbit = site.radius * (0.23 + (index % 6) * 0.105)
    return { mesh, orbit, angle: index * 2.4, phase: ((index * 11) % 28) / 28, rate: 0.22 + index % 5 * 0.023, share: ((index * 17) % 28) / 28 }
  })
  return (time: number, strength: number) => {
    root.setEnabled(strength > 0.02)
    if (strength <= 0.02) return
    for (const { mesh, orbit, angle, phase, rate, share } of motes) {
      mesh.setEnabled(share < strength)
      const rise = (time * rate * (0.55 + 0.45 * strength) + phase) % 1
      const spin = angle + rise * 1.8
      const fade = Math.min(1, rise * 8, (1 - rise) * 6)
      mesh.position.set(orbit * Math.cos(spin), 0.4 + rise * site.ceiling, orbit * Math.sin(spin))
      mesh.scaling.set(0.13 * fade, 0.54 * fade, 0.13 * fade)
    }
  }
}

export function createRidgeUpdraft(meshes: MeshFactory) {
  const columns = liftSites.map((site) => ({ site, draw: createLiftColumn(meshes, site) }))
  return (time: number, hour = 13, rain = 0) => {
    for (const { site, draw } of columns) draw(time, liftStrength(site, hour, rain))
  }
}
