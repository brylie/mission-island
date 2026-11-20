import type { Material } from '@babylonjs/core/Materials/material'
import { SpotLight } from '@babylonjs/core/Lights/spotLight'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import { defaultAppearance, skinTones, uniforms } from './crew-appearance'
import type { CrewAppearance } from './crew-appearance'
import { surfaces } from './materials'
import { treeTrunkRadius } from './scenery'
import { waterLevel } from './terrain'
import { laneMarkings, ribbonGeometry } from './routes'
import { wheelAxles, wheelRadius, wheelTrack } from './truck-pose'
import { chestSize, crateSize, harborDock, houseRoofRise, skiffStart, truckBed, truckSideRails, truckTailLip } from './world'
import type { buildings, Point } from './world'

const cream = '#fff3d0'
export const playerColors = [uniforms.amber.color, uniforms.blue.color]
export const umbrellaColors = ['#e97a59', '#ffce64', '#4faba4']

export function createHouse(meshes: MeshFactory, building: typeof buildings[number]) {
  const { scene, box, surface, shadows, paintSurface } = meshes
  const root = new TransformNode('House', scene)
  const { x, z, w, d, h, wall } = building
  root.position.set(x, 0, z)

  function roof() {
    const { w, d, h, roof: color } = building
    const left = -w / 2 - 0.35
    const right = w / 2 + 0.35
    const front = -d / 2 - 0.3
    const back = d / 2 + 0.3
    const top = h + houseRoofRise
    for (const [edge, tilt, sign] of [[front, -1, -1], [back, 1, 1]]) {
      const length = Math.hypot(edge, top - h)
      // The slopes overlap under the ridge cap. Recess one end face so they can share that joint.
      const slab = box(0, (h + top) / 2, edge / 2, right - left - (sign > 0 ? 0.025 : 0), 0.19, length, color, root)
      slab.rotation.x = tilt * Math.atan2(top - h, Math.abs(edge))
      const ridge = box(0, h + 0.06, edge, right - left + 0.1, 0.16, 0.16, color, root)
      ridge.position.z += sign * 0.03
    }
    const gable = surface('Gables', [
      left + 0.22, h, front, left + 0.22, h, back, left + 0.22, top, 0,
      right - 0.22, h, front, right - 0.22, top, 0, right - 0.22, h, back,
    ], [0, 2, 1, 3, 5, 4], building.wall, root)
    shadows.addShadowCaster(gable, false)
    box(0, top + 0.01, 0, right - left + 0.07, 0.14, 0.17, color, root)
  }

  box(0, 0.12, 0, w + 0.35, 0.25, d + 0.35, paintSurface('concrete'), root)
  box(0, h / 2, 0, w, h, d, wall, root)
  roof()
  box(0, 1.25, -d / 2 - 0.04, 1.26, 2.48, 0.13, '#395951', root)
  for (const sign of [-1, 1]) {
    box(sign * w * 0.31, h * 0.61, -d / 2 - 0.04, 1.24, 1.03, 0.15, cream, root)
    box(sign * w * 0.31, h * 0.61, -d / 2 - 0.13, 0.96, 0.77, 0.06, '#4c7a83', root)
    box(sign * w * 0.31, h * 0.61, -d / 2 - 0.17, 0.075, 0.8, 0.045, cream, root)
  }
  if (w > 5) box(w * 0.26, h + 1.08, 0.6, 0.55, 1.55, 0.52, '#925c4b', root)
  return root
}

export function createFlatbed({ scene, box, cylinder, paint, paintSurface }: MeshFactory) {
  const truck = new TransformNode('Flatbed', scene)
  const beam = new SpotLight('Flatbed headlights', new Vector3(0, 1.1, 2.98), new Vector3(0, -0.10, 1), 0.9, 1.1, scene)
  beam.parent = truck
  beam.diffuse = Color3.FromHexString('#ffe9ad')
  beam.range = 28
  beam.setEnabled(false)
  const brakeBeam = new SpotLight('Flatbed brake lights', new Vector3(0, 0.57, -3.12),
    new Vector3(0, -0.28, -1), 1.5, 1.4, scene)
  brakeBeam.parent = truck
  brakeBeam.diffuse = Color3.FromHexString('#ff391f')
  brakeBeam.range = 5
  brakeBeam.intensity = 2.2
  brakeBeam.setEnabled(false)
  const lamps: { mesh: Mesh; lit: Material; unlit: Material; braking?: Material }[] = []
  const wheels: { axle: TransformNode; spin: TransformNode; steering: boolean }[] = []
  // The deck overhang keeps the joined side faces at distinct depths.
  box(0, 0.68, 0, truckBed.width - 0.16, 0.53, 5.7, '#374848', truck).name = 'Chassis'
  box(0, 1.09, 1.55, 2.46, 0.68, 2.63, '#f5bc54', truck)
  box(0, 1.75, 1.03, 2.36, 1.1, 1.52, '#edae45', truck)
  box(0, 1.9, 1.8, 1.96, 0.62, 0.07, '#426976', truck)
  for (const side of [-1, 1]) {
    box(side * 1.19, 1.91, 1.02, 0.07, 0.6, 1.18, '#557b83', truck)
    box(side * 1.33, 1.6, 1.58, 0.26, 0.27, 0.3, '#435853', truck)
    const head = paint('#fff4c1')
    const tail = paint('#be5848')
    lamps.push(
      { mesh: box(side * 0.86, 1.08, 2.9, 0.47, 0.25, 0.09, head, truck), unlit: head, lit: paint('#fff3b0', true) },
      { mesh: box(side * 0.89, 0.57, -3.065, 0.33, 0.17, 0.042, tail, truck),
        unlit: tail, lit: paint('#c83832', true), braking: paint('#ff7763', true) },
    )
    for (const z of wheelAxles) {
      const axle = new TransformNode('Wheel steering', scene)
      axle.parent = truck
      axle.position.set(side * wheelTrack, wheelRadius, z)
      const spin = new TransformNode('Wheel spin', scene)
      spin.parent = axle
      cylinder(0, 0, 0, 0.96, 0.96, 0.46, 14, '#253834', spin).rotation.z = Math.PI / 2
      cylinder(side * 0.24, 0, 0, 0.42, 0.42, 0.04, 10, '#9aab9d', spin).rotation.z = Math.PI / 2
      wheels.push({ axle, spin, steering: z > 0 })
    }
  }
  box(0, truckBed.top - 0.155, truckBed.center, truckBed.width, 0.19, truckBed.length, '#a97e54', truck).name = 'Deck'
  for (const x of [-0.68, -0.23, 0.23, 0.68]) {
    box(x, truckBed.top - 0.058, truckBed.center, 0.025, 0.015, truckBed.length - 0.045, '#8b6746', truck, false)
  }
  const railBase = truckBed.top - 0.06
  const { x: railX, height: railHeight, thickness } = truckSideRails
  const planks = paintSurface('wood', '#b18c61')
  const postDepth = 0.12
  const endPost = (truckBed.length - postDepth) / 2
  const posts = [-endPost, 0, endPost]
  const joint = postDepth / 2 + 0.012
  for (const side of [-1, 1]) {
    const x = side * railX
    for (const along of posts) {
      box(x, railBase + railHeight / 2, truckBed.center + along,
        thickness + 0.036, railHeight, postDepth, '#415653', truck)
    }
    for (let i = 1; i < posts.length; i++) {
      const start = posts[i - 1] + joint
      const end = posts[i] - joint
      const center = truckBed.center + (start + end) / 2
      box(x, railBase + 0.21, center, thickness, 0.16, end - start, planks, truck)
      box(x, railBase + railHeight - 0.085, center, thickness, 0.17, end - start, planks, truck)
    }
  }
  box(0, railBase + truckTailLip.height / 2, truckTailLip.z,
    truckBed.width, truckTailLip.height, truckTailLip.thickness, planks, truck)
  box(0, 0.61, 2.87, 2.51, 0.27, 0.2, paintSurface('metal', surfaces.metal.color), truck)
  box(0, 0.56, -2.94, 2.52, 0.24, 0.2, paintSurface('metal', surfaces.metal.color), truck)
  return {
    root: truck, wheels,
    setLights(strength: number, braking = false) {
      const lit = strength > 0.04
      beam.setEnabled(lit)
      beam.intensity = strength * 2.3
      brakeBeam.setEnabled(braking)
      for (const lamp of lamps) lamp.mesh.material = braking && lamp.braking ? lamp.braking : lit ? lamp.lit : lamp.unlit
    },
  }
}

export function poseFlatbed(truck: ReturnType<typeof createFlatbed>, rotation: number, steering: number,
  suspension?: number[], blend = 1,
) {
  for (const [index, wheel] of truck.wheels.entries()) {
    wheel.spin.rotation.x = rotation
    wheel.axle.rotation.y = wheel.steering ? steering : 0
    wheel.axle.position.y += ((suspension?.[index] ?? wheelRadius) - wheel.axle.position.y) * blend
  }
}

export function createCrew({ scene, sphere, paint }: MeshFactory, id: number) {
  const root = new TransformNode(`Crew ${id + 1}`, scene)
  const arms: TransformNode[] = []
  const legs: TransformNode[] = []
  const fabric: Mesh[] = []
  const accents: Mesh[] = []
  const skin: Mesh[] = []
  const eyes: { mesh: Mesh; height: number }[] = []
  for (const side of [-1, 1]) {
    const leg = new TransformNode('Hip', scene)
    leg.parent = root
    leg.position.set(side * 0.19, 0.68, 0.02)
    sphere(0, -0.27, 0, 0.31, 0.66, 0.32, '#36595e', leg, true, 12)
    sphere(0, -0.54, 0.10, 0.36, 0.28, 0.56, '#294343', leg, true, 12)
    legs.push(leg)
    const arm = new TransformNode('Shoulder', scene)
    arm.parent = root
    arm.position.set(side * 0.36, 1.19, 0.03)
    const sleeve = sphere(side * 0.075, -0.22, 0, 0.27, 0.58, 0.28, cream, arm, true, 12)
    sleeve.rotation.z = side * 0.18
    fabric.push(sleeve)
    accents.push(sphere(side * 0.11, -0.44, 0, 0.225, 0.11, 0.24, cream, arm))
    skin.push(sphere(side * 0.12, -0.53, 0.017, 0.205, 0.24, 0.22, cream, arm, true, 10))
    arms.push(arm)
  }
  fabric.push(sphere(0, 0.98, 0, 0.82, 0.79, 0.59, cream, root, true, 16))
  accents.push(sphere(0, 1.23, 0.167, 0.38, 0.12, 0.31, cream, root))
  for (const side of [-1, 1]) {
    const strap = sphere(side * 0.179, 1.014, -0.248, 0.12, 0.49, 0.12, cream, root)
    strap.rotation.z = -side * 0.17
    accents.push(strap)
  }
  accents.push(sphere(-0.163, 1.107, 0.245, 0.16, 0.138, 0.082, cream, root))

  skin.push(sphere(0, 1.46, 0.046, 0.56, 0.56, 0.55, cream, root, true, 18))
  skin.push(sphere(0, 1.455, 0.303, 0.13, 0.112, 0.12, cream, root, false, 10))
  for (const side of [-1, 1]) {
    skin.push(sphere(side * 0.264, 1.46, 0.066, 0.12, 0.17, 0.1, cream, root))
    const white = sphere(side * 0.105, 1.511, 0.296, 0.093, 0.11, 0.048, '#fff4e2', root, false, 10)
    const pupil = sphere(side * 0.105, 1.507, 0.319, 0.049, 0.065, 0.027, '#3c3931', root, false, 10)
    eyes.push({ mesh: white, height: white.scaling.y }, { mesh: pupil, height: pupil.scaling.y })
  }
  sphere(0, 1.366, 0.296, 0.135, 0.025, 0.033, '#754d43', root, false, 10)
  fabric.push(sphere(0, 1.712, 0.016, 0.61, 0.31, 0.6, cream, root, true, 16))
  accents.push(sphere(0, 1.654, 0.185, 0.615, 0.068, 0.53, cream, root, true, 16))

  let worn: CrewAppearance | undefined
  function setAppearance(appearance = defaultAppearance) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin) return
    worn = appearance
    const uniform = uniforms[appearance.uniform === 'default' ? (id === 0 ? 'amber' : 'blue') : appearance.uniform]
    const tone = skinTones[appearance.skin === 'default' ? (id === 0 ? 'light' : 'medium') : appearance.skin]
    const colors = [paint(uniform.color), paint(uniform.trim), paint(tone.color)]
    for (const [i, parts] of [fabric, accents, skin].entries()) {
      for (const part of parts) part.material = colors[i]
    }
  }
  function blink(time: number) {
    const phase = (time + 4.1 + id * 1.59) % (5.8 + id * 0.47)
    const openness = Math.max(0.08, Math.min(1, Math.abs(phase - 0.11) / 0.11))
    for (const { mesh, height } of eyes) mesh.scaling.y = height * openness
  }
  setAppearance()
  return { root, arms, legs, setAppearance, blink }
}

export function poseCrew(crew: ReturnType<typeof createCrew>, cycle: number, stride: number, airborne: boolean,
  carrying?: 'crate' | 'extinguisher' | 'tool', reach = 0, blend = 1, winding = 0, throwing = false, rightHandRaised = false) {
  const swing = Math.sin(cycle * Math.PI * 2) * stride
  for (const [i, leg] of crew.legs.entries()) {
    const side = i === 0 ? -1 : 1
    leg.rotation.x += ((airborne ? side * 0.35 : swing * side) - leg.rotation.x) * blend
    const arm = crew.arms[i]
    const swinging = airborne ? -0.8 : -swing * side * 0.77
    const relaxed = throwing ? -1.75 : carrying === 'crate' ? -1.22 - winding * 0.67
      : (carrying === 'extinguisher' || carrying === 'tool') && i === 0 ? -1.36 : swinging
    const reachAmount = i === 0 ? reach : Number(rightHandRaised)
    const forward = relaxed + (-Math.PI / 2 - relaxed) * reachAmount
    arm.rotation.x += (forward - arm.rotation.x) * blend
  }
}

export function createFarmTools({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  const hoe = new TransformNode('Hoe', scene)
  const can = new TransformNode('Watering can', scene)
  for (const grip of [hoe, can]) {
    grip.parent = character.arms[0]
    grip.position.set(-0.12, -0.53, 0.017)
    grip.setEnabled(false)
  }
  hoe.rotation.z = -0.8
  cylinder(0, -0.36, 0, 0.068, 0.068, 1.29, 9, '#ab784d', hoe)
  box(0, -0.99, 0.08, 0.21, 0.082, 0.34, '#58716e', hoe)
  sphere(0, -0.16, 0.15, 0.33, 0.42, 0.32, '#608f87', can)
  box(0, -0.16, 0.35, 0.073, 0.09, 0.25, '#6a9990', can).rotation.x = -0.35
  sphere(0, -0.13, 0.48, 0.117, 0.11, 0.09, '#d0ae72', can)
  return { hoe, can }
}

export function createHomeChest({ scene, box, paintSurface }: MeshFactory, point: Point, color: string) {
  const root = new TransformNode('Home chest', scene)
  root.position.set(point.x, 0, point.z)
  const { width, depth, height } = chestSize
  const wood = paintSurface('wood', '#a77a52')
  const boxHeight = height - 0.145
  box(0, boxHeight / 2, 0, width - 0.045, boxHeight, depth - 0.035, wood, root)
  box(0, boxHeight - 0.072, -0.014, width - 0.16, 0.1, depth - 0.015, color, root)
  const hinge = new TransformNode('Chest lid', scene)
  hinge.parent = root
  hinge.position.set(0, boxHeight + 0.007, depth / 2)
  box(0, 0.064, -depth / 2, width, 0.128, depth, wood, hinge)
  box(0, -0.012, -depth - 0.009, 0.133, 0.16, 0.032, '#dbb26c', hinge)
  return { root, hinge }
}

export function poseSkiffCrew(crew: ReturnType<typeof createCrew>, stroke: number, side: number, fishing: boolean, blend: number) {
  for (const [i, leg] of crew.legs.entries()) {
    leg.rotation.x += (-1.27 - leg.rotation.x) * blend
    const arm = crew.arms[i]
    const outerArm = i === (side < 0 ? 0 : 1)
    const pose = fishing ? (outerArm ? -1.39 : -1.07) : outerArm ? -1.09 + stroke * 0.59 : -1.25 + stroke * 0.22
    arm.rotation.x += (pose - arm.rotation.x) * blend
  }
}

export function createSkiffGear({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  return [-1, 1].map((side, i) => {
    const grip = new TransformNode('Skiff gear', scene)
    grip.parent = character.arms[i]
    grip.position.set(side * 0.12, -0.53, 0.017)
    const paddle = new TransformNode('Paddle', scene)
    paddle.parent = grip
    paddle.rotation.z = side * 1.34
    cylinder(0, -0.23, 0, 0.056, 0.056, 1.28, 8, '#8f6746', paddle)
    box(0, -0.96, 0, 0.25, 0.4, 0.068, '#c29862', paddle)
    const rod = new TransformNode('Fishing rod', scene)
    rod.parent = grip
    cylinder(0, -0.6, 0, 0.04, 0.013, 1.65, 8, '#496552', rod)
    sphere(0, -0.12, 0.06, 0.13, 0.12, 0.09, '#cbd4bd', rod, false)
    grip.setEnabled(false)
    return { grip, paddle, rod }
  })
}

export function createSupply({ scene, box, cylinder }: MeshFactory, kind: 'crate' | 'extinguisher') {
  const node = new TransformNode('Supply', scene)
  if (kind === 'crate') {
    box(0, 0, 0, crateSize, crateSize, crateSize, '#cf8b4f', node)
    for (const side of [-1, 1]) {
      box(side * 0.3, 0, 0, 0.11, 0.91, 0.91, '#f9c174', node)
    }
    box(0, 0.06, -0.453, 0.35, 0.23, 0.02, '#ffe8b1', node)
  } else {
    cylinder(0, 0.48, 0, 0.56, 0.56, 0.83, 12, '#d4513d', node)
    cylinder(0, 0.57, 0, 0.57, 0.57, 0.18, 12, cream, node)
    box(0, 0.98, 0, 0.42, 0.15, 0.22, '#2b4445', node)
    box(0, 0.98, 0.19, 0.15, 0.12, 0.35, '#2b4445', node)
  }
  return node
}

export function createUmbrella({ cylinder, box }: MeshFactory, x: number, z: number, color: string) {
  cylinder(x, 1.25, z, 0.12, 0.16, 2.5, 6, '#8c6545')
  cylinder(x, 2.6, z, 0.15, 3, 0.67, 8, color)
  box(x + 1.2, 0.11, z + 0.3, 0.87, 0.13, 1.4, '#f4e2b6')
}

export function createTree({ cylinder, sphere, paintSurface }: MeshFactory, x: number, z: number, height: number, variant: number, ground = 0) {
  cylinder(x, ground + height * 0.25 - 0.08, z, 0.31, treeTrunkRadius * 2, height * 0.5 + 0.16, 6, paintSurface('wood'))
  const canopy = paintSurface('leaves', ['#44784b', '#558953', '#366d4c', surfaces.leaves.color][variant % 4])
  if (variant % 3 === 0) {
    sphere(x, ground + height * 0.64, z, height * 0.8, height * 0.8, height * 0.77, canopy)
    sphere(x + height * 0.23, ground + height * 0.54, z + 0.27, height * 0.58, height * 0.57, height * 0.54, paintSurface('leaves', '#619553'))
  } else {
    cylinder(x, ground + height * 0.55, z, 0.1, height * 0.67, height * 0.63, 7, canopy)
    cylinder(x, ground + height * 0.76, z, 0.04, height * 0.48, height * 0.61, 7, paintSurface('leaves', variant % 2 ? '#55894e' : '#3e7852'))
  }
}

export function createRock({ sphere, paintSurface }: MeshFactory, x: number, z: number, size: number, angle: number, light: boolean, ground = 0) {
  const rock = sphere(x, size * 0.12 + ground, z, size, size * 0.78, size * 1.1,
    paintSurface('stone', light ? '#b0ad91' : surfaces.stone.color))
  rock.rotation.y = angle
  return rock
}

export function createDock({ box, cylinder, paintSurface }: MeshFactory) {
  for (let i = 0; i < harborDock.planks; i++) {
    box(harborDock.x, harborDock.top - 0.1, harborDock.firstZ - i * harborDock.spacing,
      harborDock.width, 0.2, harborDock.plankDepth, paintSurface('wood', i % 3 ? '#a67548' : '#b88758'))
  }
  for (const x of [-45.6, -42.4]) {
    for (const z of [-31, -34, -37]) cylinder(x, -0.42, z, 0.43, 0.43, 2.25, 7, paintSurface('wood'))
  }
}

export function createHarborBoat({ scene, box, surface, paintSurface, shadows }: MeshFactory) {
  const boat = new TransformNode('Harbor skiff', scene)
  boat.position.set(skiffStart.x, waterLevel, skiffStart.z)
  boat.rotation.y = skiffStart.heading
  const outline = [
    [-0.9, -2.32], [0.9, -2.32], [1.14, -1.18], [1.14, 0.45],
    [0.81, 1.57], [0.29, 2.44], [0, 2.75], [-0.29, 2.44],
    [-0.81, 1.57], [-1.14, 0.45], [-1.14, -1.18],
  ]
  const rimHeight = (z: number) => 0.4 + Math.max(0, z) * 0.075
  const outer: number[] = []
  const inner: number[] = []
  const sideIndices: number[] = []
  for (const [i, [x, z]] of outline.entries()) {
    outer.push(x * 0.72, -0.44 + Math.max(0, z) * 0.09, z * 0.94, x, rimHeight(z), z)
    inner.push(x * 0.71, 0.073, z * 0.92, x * 0.91, rimHeight(z) - 0.022, z * 0.96)
    const a = i * 2
    const b = ((i + 1) % outline.length) * 2
    sideIndices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  surface('Flared hull', outer, sideIndices, '#eee8cc', boat)
  surface('Inside hull', inner, sideIndices.slice().reverse(), '#6e9290', boat)
  const floor = outline.flatMap(([x, z]) => [x * 0.71, 0.073, z * 0.92])
  const planks = Array.from({ length: outline.length - 2 }, (_, i) => [0, i + 1, i + 2]).flat()
  surface('Cockpit floor', floor, planks, '#8b9b87', boat)
  const wood = paintSurface('wood', '#c4935c')
  // Each segment shares its corner vertices with the next one.
  const trim = outline.flatMap(([x, z]) => {
    const y = rimHeight(z)
    return [x * 1.042, y + 0.034, z * 1.02, x * 0.895, y + 0.034, z * 0.95,
      x * 1.028, y - 0.05, z * 1.02, x * 0.905, y - 0.05, z * 0.95]
  })
  const trimIndices = outline.flatMap((_, i) => {
    const a = i * 4
    const b = (i + 1) % outline.length * 4
    return [a, b, a + 1, b, b + 1, a + 1,
      a, a + 2, b, b, a + 2, b + 2,
      a + 1, b + 1, a + 3, b + 1, b + 3, a + 3,
      a + 2, a + 3, b + 2, b + 2, a + 3, b + 3]
  })
  const trimUvs = outline.flatMap(([x, z]) => [x, z, x, z + 0.2, x, z - 0.1, x, z + 0.3])
  const rim = surface('Wood rim', trim, trimIndices, wood, boat, trimUvs)
  shadows.addShadowCaster(rim, false)
  for (const z of [-1.3, 0.25, 1.42]) {
    box(0, 0.19, z, z > 1 ? 1.58 : 1.99, 0.12, 0.44, wood, boat)
  }
  box(0, 0.29, -2.34, 0.39, 0.62, 0.28, '#36484a', boat)
  box(0, 0.62, -2.37, 0.51, 0.35, 0.43, '#c96948', boat)
  return boat
}

export function createBuoy({ scene, sphere, box, cylinder }: MeshFactory, x: number, z: number) {
  const buoy = new TransformNode('Mooring buoy', scene)
  buoy.position.set(x, waterLevel, z)
  sphere(0, 0.03, 0, 0.92, 0.58, 0.92, '#d98545', buoy, false)
  cylinder(0, 0.08, 0, 0.87, 0.87, 0.08, 16, '#fae4b3', buoy)
  box(0, 0.34, 0, 0.13, 0.23, 0.13, '#f4c66e', buoy, false)
  return buoy
}

export function poseFloating(node: TransformNode, time: number, phase = 0, amplitude = 0.065) {
  node.position.y = waterLevel + Math.sin(time * 1.6 + phase) * amplitude
  node.rotation.x = Math.sin(time * 1.13 + phase * 0.6) * 0.035
  node.rotation.z = Math.cos(time * 1.4 + phase) * 0.048
}

function ribbon({ surface }: MeshFactory, name: string, strips: ReadonlyArray<readonly Point[]>,
  width: number, y: number, material: string | Material, tile = 2.5) {
  const { positions, indices } = ribbonGeometry(strips, width, y)
  const uvs: number[] = []
  for (let i = 0; i < positions.length; i += 3) uvs.push(positions[i] / tile, positions[i + 2] / tile)
  return surface(name, positions, indices, material, undefined, uvs).freezeWorldMatrix()
}

export function createRoad(meshes: MeshFactory, points: readonly Point[], width = 6) {
  return {
    shoulder: ribbon(meshes, 'Road shoulder', [points], width + 1.4, 0.056, meshes.paintSurface('gravel'), 2.05),
    asphalt: ribbon(meshes, 'Asphalt', [points], width, 0.084, meshes.paintSurface('stone', '#636d65'), 3.0),
    markings: ribbon(meshes, 'Centerline', laneMarkings(points), 0.17, 0.099, '#e0cd9f'),
  }
}

export function createTrail(meshes: MeshFactory, name: string, points: readonly Point[], width: number, paved = false) {
  return ribbon(meshes, name, [points], width, paved ? 0.065 : 0.039,
    meshes.paintSurface(paved ? 'concrete' : 'gravel'), paved ? 2.0 : 1.85)
}
