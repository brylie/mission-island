import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { ridgeUpdraft } from '../worlds/starter/ridge-scout'

export function createRidgeUpdraft({ scene, sphere, paint }: MeshFactory) {
  const root = new TransformNode('Windstone updraft', scene)
  root.position.set(ridgeUpdraft.x, groundHeight(ridgeUpdraft), ridgeUpdraft.z)
  const material = paint('#d4c2ff', true)
  const motes = Array.from({ length: 28 }, (_, index) => {
    const mesh = sphere(0, 0, 0, .14, .48, .14, material, root, false, 4)
    const orbit = ridgeUpdraft.radius * (.23 + (index % 6) * .105)
    return { mesh, orbit, angle: index * 2.4, phase: ((index * 11) % 28) / 28, rate: .22 + index % 5 * .023 }
  })

  return (time: number) => {
    for (const { mesh, orbit, angle, phase, rate } of motes) {
      const rise = (time * rate + phase) % 1
      const spin = angle + rise * 1.8
      const fade = Math.min(1, rise * 8, (1 - rise) * 6)
      mesh.position.set(orbit * Math.cos(spin), .4 + rise * ridgeUpdraft.ceiling, orbit * Math.sin(spin))
      mesh.scaling.set(.13 * fade, .54 * fade, .13 * fade)
    }
  }
}
