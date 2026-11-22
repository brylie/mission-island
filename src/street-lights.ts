import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createStreetLamp } from './assets/street-lamp'
import type { MeshFactory } from './island-meshes'
import { lampPosts as posts } from './worlds/starter/sites'
import { groundHeight } from './terrain'
import { distance } from './world'
import type { Point } from './world'

const lightRange = 22
const nearestLampSearchRadius = 26
const minimumNightStrength = 0.04
const nightIntensity = 2.15

export function createStreetLights(meshes: MeshFactory) {
  const { scene, paint } = meshes
  const fill = new PointLight('Nearest street lamp', Vector3.Zero(), scene)
  fill.diffuse = Color3.FromHexString('#ffcc88')
  fill.range = lightRange
  fill.setEnabled(false)
  const glass = paint('#fff0c9')
  const glow = paint('#ffe2a2', true)
  const bulbs = new TransformNode('Streetlamp bulbs', scene)
  const globes = posts.map((point) => createStreetLamp(meshes, { ...point, y: groundHeight(point) }, glass, bulbs))
  let lit = false
  return (camera: Point, strength: number) => {
    let nearest = -1
    let range = nearestLampSearchRadius
    for (const [index, post] of posts.entries()) {
      const gap = distance(post, camera)
      if (gap >= range) continue
      nearest = index
      range = gap
    }
    const night = strength > minimumNightStrength
    if (lit !== night) {
      lit = night
      for (const globe of globes) globe.material = lit ? glow : glass
    }
    fill.setEnabled(night && nearest >= 0)
    if (nearest < 0 || !night) return
    fill.position.copyFrom(globes[nearest].position)
    fill.intensity = strength * nightIntensity
  }
}
