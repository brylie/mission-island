import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import { lampPosts as posts } from './worlds/starter/sites'
import { groundHeight } from './terrain'
import { distance } from './world'
import type { Point } from './world'

export function createStreetLights({ scene, box, cylinder, sphere, paint }: MeshFactory) {
  const fill = new PointLight('Nearest street lamp', Vector3.Zero(), scene)
  fill.diffuse = Color3.FromHexString('#ffcc88')
  fill.range = 22
  fill.setEnabled(false)
  const glass = paint('#fff0c9')
  const glow = paint('#ffe2a2', true)
  const bulbs = new TransformNode('Streetlamp bulbs', scene)
  const globes = posts.map((point) => {
    const { x, z } = point
    const y = groundHeight(point)
    cylinder(x, y + 1.37, z, 0.10, 0.14, 2.74, 8, '#4c584b')
    box(x, y + 2.71, z - 0.17, 0.1, 0.09, 0.42, '#4c584b')
    cylinder(x, y + 2.65, z - 0.31, 0.21, 0.39, 0.15, 10, '#4c584b')
    return sphere(x, y + 2.53, z - 0.31, 0.24, 0.20, 0.24, glass, bulbs, false)
  })
  let lit = false
  return (camera: Point, strength: number) => {
    let nearest = -1
    let range = 26
    for (const [index, post] of posts.entries()) {
      const gap = distance(post, camera)
      if (gap >= range) continue
      nearest = index
      range = gap
    }
    const night = strength > 0.04
    if (lit !== night) {
      lit = night
      for (const globe of globes) globe.material = lit ? glow : glass
    }
    fill.setEnabled(night && nearest >= 0)
    if (nearest < 0 || !night) return
    fill.position.copyFrom(globes[nearest].position)
    fill.intensity = strength * 2.15
  }
}
