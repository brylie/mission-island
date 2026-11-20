import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { defaultAppearance, skinTones, uniforms } from '../crew-appearance'
import type { CrewAppearance } from '../crew-appearance'
import { waterLevel } from '../terrain'
const cream = '#fff3d0'

export const playerColors = [uniforms.amber.color, uniforms.blue.color]

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
  const cap = sphere(0, 1.712, 0.016, 0.61, 0.31, 0.6, cream, root, true, 16)
  const brim = sphere(0, 1.654, 0.185, 0.615, 0.068, 0.53, cream, root, true, 16)
  fabric.push(cap)
  accents.push(brim)

  let worn: CrewAppearance | undefined
  let lastDye: string | undefined
  function setAppearance(appearance = defaultAppearance, dye?: string) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin && lastDye === dye) return
    lastDye = dye
    worn = appearance
    const uniform = uniforms[appearance.uniform === 'default' ? (id === 0 ? 'amber' : 'blue') : appearance.uniform]
    const tone = skinTones[appearance.skin === 'default' ? (id === 0 ? 'light' : 'medium') : appearance.skin]
    const colors = [paint(dye ?? uniform.color), paint(uniform.trim), paint(tone.color)]
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
  return { root, arms, legs, setAppearance, blink, setCap(visible: boolean) { cap.setEnabled(visible); brim.setEnabled(visible) } }
}

export function poseCrew(crew: ReturnType<typeof createCrew>, cycle: number, stride: number, airborne: boolean,
  carrying?: 'crate' | 'extinguisher' | 'tool', reach = 0, blend = 1, winding = 0, throwing = false, rightHandRaised = false) {
  const swing = Math.sin(cycle * Math.PI * 2) * stride
  for (const [i, leg] of crew.legs.entries()) {
    const side = i === 0 ? -1 : 1
    leg.rotation.x += ((airborne ? side * 0.35 : swing * side) - leg.rotation.x) * blend
    const arm = crew.arms[i]
    arm.rotation.z *= 1 - blend
    const swinging = airborne ? -0.8 : -swing * side * 0.77
    const relaxed = throwing ? -1.75 : carrying === 'crate' ? -1.22 - winding * 0.67
      : (carrying === 'extinguisher' || carrying === 'tool') && i === 0 ? -1.36 : swinging
    const reachAmount = i === 0 ? reach : Number(rightHandRaised)
    const forward = relaxed + (-Math.PI / 2 - relaxed) * reachAmount
    arm.rotation.x += (forward - arm.rotation.x) * blend
  }
}

export function poseSwimming(crew: ReturnType<typeof createCrew>, time: number, speed: number, blend = 1) {
  const stroke = time * Math.PI * 2 / 1.6
  crew.root.rotation.x = .06 + .22 * speed
  for (const [i, arm] of crew.arms.entries()) {
    const side = i === 0 ? -1 : 1
    const reach = -.86 - Math.cos(stroke) * (.2 + .46 * speed)
    const sweep = side * (.7 + Math.sin(stroke) * .44)
    arm.rotation.x += (reach - arm.rotation.x) * blend
    arm.rotation.z += (sweep - arm.rotation.z) * blend
    crew.legs[i].rotation.x = .25 + side * Math.sin(stroke * 2) * (.17 + .27 * speed)
  }
}

export function swimmingHeight(time: number) {
  return waterLevel - 1.01 + .036 * Math.sin(time * Math.PI * 2 / 1.6)
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

export function poseSkiffCrew(crew: ReturnType<typeof createCrew>, stroke: number, side: number, fishing: boolean, blend: number) {
  for (const [i, leg] of crew.legs.entries()) {
    leg.rotation.x += (-1.27 - leg.rotation.x) * blend
    const arm = crew.arms[i]
    arm.rotation.z *= 1 - blend
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
