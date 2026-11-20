import { createSchoolFish } from './assets/fish'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import type { Weather } from './protocol'
import type { Point } from './world'
import { createMovingEffects } from './world-particles'
import { birdActivity, schoolAvoidance } from './wildlife-motion'

export interface WildlifeFrame {
  time: number
  delta: number
  seek?: boolean
  weather: Weather
  weatherAt?: (time: number) => Weather
  camera: { x: number; y: number; z: number }
  threats: readonly Point[]
}

interface School {
  swim: (time: number) => Point
  deep: Point
  level: number
  isWater: (point: Point) => boolean
}

export function createSchools(meshes: MeshFactory, groups: readonly School[]) {
  const paint = meshes.paint('#8ac0ad')
  paint.backFaceCulling = false
  const schools = groups.map((group) => ({
    ...group, flee: { x: 0, z: 0 }, heading: undefined as number | undefined,
    fish: Array.from({ length: 6 }, (_, i) => {
      const node = createSchoolFish(meshes, paint)
      node.scaling.setAll(.79 + i % 4 * .11)
      return node
    }),
  }))
  return ({ time, delta, camera, threats, seek }: WildlifeFrame) => {
    for (const school of schools) {
      const { swim, deep, level, flee, fish, isWater } = school
      const origin = swim(time)
      const visible = camera.y - level < 47 && Math.hypot(origin.x - camera.x, origin.z - camera.z) < 75
      for (const node of fish) node.setEnabled(visible)
      if (seek) {
        school.heading = undefined
        flee.x = flee.z = 0
      }
      if (!visible) continue
      const aim = schoolAvoidance(origin, threats, deep)
      const stressed = Math.hypot(aim.x, aim.z) > .14
      const factor = 1 - Math.exp(-delta * (stressed ? 4.7 : .83))
      flee.x += (aim.x - flee.x) * factor
      flee.z += (aim.z - flee.z) * factor
      const ahead = swim(time + .065)
      const target = Math.atan2(ahead.x - origin.x + (aim.x - flee.x) * .11, ahead.z - origin.z + (aim.z - flee.z) * .11)
      if (school.heading === undefined || (!stressed && Math.hypot(flee.x, flee.z) < .001)) school.heading = target
      else {
        const turn = target - school.heading
        school.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-delta * 6))
      }
      const sin = Math.sin(school.heading), cos = Math.cos(school.heading)
      const spread = 1 + Math.hypot(flee.x, flee.z) * .2
      for (const [i, node] of fish.entries()) {
        const wave = Math.sin(time * (stressed ? 6 : 3.3) + i * 1.5)
        const side = (i % 3 - 1) * .62 * spread + wave * .09
        const along = (.55 - Math.floor(i / 3)) * .86 * spread - Math.abs(side) * .27
        const position = { x: origin.x + flee.x + side * cos + along * sin, z: origin.z + flee.z - side * sin + along * cos }
        const valid = isWater(position)
        node.position.set(valid ? position.x : origin.x + side * .16,
          level - .18 + wave * .035, valid ? position.z : origin.z + along * .16)
        node.rotation.y = school.heading + wave * .105
        node.rotation.z = wave * .055
      }
    }
  }
}

interface Flock {
  center: Point & { y: number }
  landing: Point & { y: number }
  roost: Point & { y: number }
  color: string
  range: number
  count: number
  bat?: boolean
}

export function wingedAnimal(meshes: MeshFactory, color: string, bat: boolean) {
  const root = new TransformNode(bat ? 'Night bat' : 'Flock member', meshes.scene)
  const material = meshes.paint(color)
  material.backFaceCulling = false
  meshes.sphere(0, 0, 0, .22, .17, .48, material, root, false, 5)
  const wings = [-1, 1].map((side) => {
    const tip = bat ? .54 : .81
    const outline = [0, 0, .12, side * .34, .025, .18, side * tip, 0, -.07,
      side * (bat ? .39 : .54), -.025, bat ? -.11 : -.23, side * .13, -.015, -.18]
    return meshes.surface(bat ? 'Bat membrane' : 'Flight feathers', outline, [0, 1, 2, 0, 2, 3, 0, 3, 4], material, root)
  })
  return { root, wings }
}

export function createFlocks(meshes: MeshFactory, groups: readonly Flock[]) {
  const effects = createMovingEffects(meshes.scene)
  const flocks = groups.map((group) => ({ ...group, previousGround: 0,
    members: Array.from({ length: group.count }, () => wingedAnimal(meshes, group.color, Boolean(group.bat))),
  }))
  let previousTime = -Infinity
  return ({ time, weather, camera, seek }: WildlifeFrame) => {
    const regular = !seek && time > previousTime && time - previousTime < .35
    previousTime = time
    effects.begin(time, camera, !seek)
    const { roost, landing, bat } = birdActivity(time, weather)
    for (const flock of flocks) {
      const { center, landing: meadow, roost: tree, range, members } = flock
      const visible = Math.hypot(center.x - camera.x, center.z - camera.z) < range + 86 && camera.y < center.y + 90
      const perchWeight = flock.bat ? 1 - bat : roost
      const groundWeight = flock.bat ? 0 : landing
      const leave = regular && flock.previousGround >= .84 && groundWeight < .84
      flock.previousGround = groundWeight
      if (leave) effects.burst('takeoff-feathers', meadow, .91, .86, .27)
      const rest = perchWeight + groundWeight
      for (const [i, { root, wings }] of members.entries()) {
        root.setEnabled(visible && (!flock.bat || bat > .015))
        if (!root.isEnabled()) continue
        const t = time * (flock.bat ? .92 : .22) - i * .17
        const breadth = range + (i % 3 - 1) * 1.4
        const x = center.x + Math.cos(t) * breadth
        const z = center.z + Math.sin(t) * breadth * .63
        const y = center.y + Math.sin(t * 2.0) * (flock.bat ? 2 : 1.2) + i * .18
        const onGround = (i % 3 - 1) * .66
        root.position.set(x * (1 - rest) + (tree.x + onGround) * perchWeight + (meadow.x + onGround) * groundWeight,
          y * (1 - rest) + tree.y * perchWeight + meadow.y * groundWeight + (i % 2) * .035 * rest,
          z * (1 - rest) + tree.z * perchWeight + meadow.z * groundWeight + (i % 2 - .5) * .55 * rest)
        root.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t) * .63) * (1 - rest) + rest * (.67 + i * .82)
        const flap = Math.sin(time * (flock.bat ? 15 : 5.6) + i * .72) * .52 * (1 - rest) + rest * 1.18
        wings[0].rotation.z = flap
        wings[1].rotation.z = -flap
        wings[0].rotation.y = -rest * .8
        wings[1].rotation.y = rest * .8
      }
    }
    effects.finish()
  }
}
