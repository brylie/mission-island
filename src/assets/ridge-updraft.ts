import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { updraftMotes } from './recipes/ridge-airflow'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { liftSites, liftStrength, type LiftSite } from '../worlds/starter/lift'

// Rising motes show where air lifts a wing: lilac over windward slopes, warm gold over sun-warmed
// ground. A thermal's motes thin out as the sun drops or rain cools the ground, and vanish at night.
function createLiftColumn({ scene, sphere, paint }: MeshFactory, site: LiftSite) {
  const { count, colors, sphere: shape, orbit: path, phaseStride, rate: timing, shareStride, minimumStrength, rise: plume, scale } = updraftMotes
  const root = new TransformNode(`${site.name} lift`, scene)
  root.position.set(site.x, groundHeight(site), site.z)
  const material = paint(colors[site.kind], true)
  const motes = Array.from({ length: count }, (_, index) => {
    const mesh = sphere(0, 0, 0, ...shape.dimensions, material, root, false, shape.segments)
    const orbit = site.radius * (path.minimum + (index % path.bands) * path.bandSpacing)
    return { mesh, orbit, angle: index * path.turn, phase: ((index * phaseStride) % count) / count, rate: timing.minimum + index % timing.bands * timing.bandSpacing, share: ((index * shareStride) % count) / count }
  })
  return (time: number, strength: number) => {
    root.setEnabled(strength > minimumStrength)
    if (strength <= minimumStrength) return
    for (const { mesh, orbit, angle, phase, rate, share } of motes) {
      mesh.setEnabled(share < strength)
      const rise = (time * rate * (timing.strengthBlend[0] + timing.strengthBlend[1] * strength) + phase) % 1
      const spin = angle + rise * plume.spin
      const fade = Math.min(1, rise * plume.fadeIn, (1 - rise) * plume.fadeOut)
      mesh.position.set(orbit * Math.cos(spin), plume.baseY + rise * site.ceiling, orbit * Math.sin(spin))
      mesh.scaling.set(scale.width * fade, scale.height * fade, scale.width * fade)
    }
  }
}

export function createRidgeUpdraft(meshes: MeshFactory) {
  const columns = liftSites.map((site) => ({ site, draw: createLiftColumn(meshes, site) }))
  return (time: number, hour: number = updraftMotes.previewHour, rain = 0) => {
    for (const { site, draw } of columns) draw(time, liftStrength(site, hour, rain))
  }
}
