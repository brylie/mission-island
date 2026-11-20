import { Color3 } from '@babylonjs/core/Maths/math.color'
import { createCrewClothes } from './crew-clothes'
import { createCrewHead } from './crew-head'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { appearancePartKeys, defaultAppearance, everydayColors, hairColors, isEveryday, shirtColor, skinTones, uniformPalette, uniforms, wearsSwimsuit } from '../crew-appearance'
import type { CrewAppearance } from '../crew-appearance'
import { waterLevel } from '../terrain'
const workwear = {
  courier: { trousers: '#414e64', shoes: '#75533d' },
  rescue: { trousers: '#47383a', shoes: '#252630' },
  angler: { trousers: '#303f50', shoes: '#4d3a30' },
}

export const playerColors = [uniforms.amber.color, uniforms.blue.color]
export const skiffCrewSeats = [new Vector3(-0.44, -0.39, 0.25), new Vector3(0.44, -0.39, 0.25)]

function legPalette(appearance: CrewAppearance) {
  const job = appearance.uniform === 'courier' || appearance.uniform === 'rescue' || appearance.uniform === 'angler' ? workwear[appearance.uniform] : undefined
  const trouserColor = job?.trousers ?? (appearance.trousers === 'sand' ? '#b79669' : '#405464')
  const shoeColor = job?.shoes ?? (appearance.shoes === 'brown' ? '#76523a' : '#394847')
  return { trouserColor, shoeColor }
}

export function createCrew(meshes: MeshFactory, id: number) {
  const root = new TransformNode(`Crew ${id + 1}`, meshes.scene)
  const kit = createCrewClothes(meshes, root)
  const head = createCrewHead(meshes, root, kit.skin)
  const { paint } = meshes
  let showCap = true, hatEquipped = true
  let worn: CrewAppearance | undefined
  let lastBase = id, lastDye: string | undefined

  function fitHat() {
    const visible = showCap && hatEquipped
    head.cap.setEnabled(visible)
    head.brim.setEnabled(visible)
    head.hair(hairColors[worn?.hairColor ?? 'chestnut'], worn?.hair === 'bare', visible)
  }
  function setCap(visible: boolean) {
    if (showCap === visible) return
    showCap = visible
    fitHat()
  }
  function dress(appearance: CrewAppearance, base: number, dye?: string) {
    const everyday = isEveryday(appearance.uniform)
    const swim = wearsSwimsuit(appearance)
    const bare = everyday && (appearance.shoes === 'bare' || (swim && !appearance.shoes))
    const shirt = shirtColor(appearance, base)
    const cloth = paint(dye ?? shirt.color), trim = paint(shirt.trim)
    const tone = skinTones[appearance.skin === 'default' ? (base === 0 ? 'light' : 'medium') : appearance.skin].color
    const skin = paint(tone)
    const warm = paint(Color3.Lerp(Color3.FromHexString(tone), Color3.FromHexString('#aa6250'), .27).toHexString())
    for (const mesh of kit.skin) mesh.material = skin
    head.nose.material = warm
    for (const ear of head.earShadows) ear.material = warm
    const { trouserColor, shoeColor } = legPalette(appearance)
    const canvas = Color3.FromHexString(dye ?? shirt.color)
    kit.yoke.material = paint(canvas.scale(.81).toHexString())
    kit.yoke.setEnabled(!swim)
    kit.torso.setEnabled(!swim)
    kit.torso.material = cloth
    kit.inset.setEnabled(!swim)
    kit.swimSeam.position.z = .156
    kit.swimSeam.material = trim
    kit.swimSeam.setEnabled(swim)
    for (const mesh of kit.cloth) { mesh.material = mesh.name === 'Folded canvas collar' ? paint(canvas.scale(.90).toHexString()) : cloth; mesh.setEnabled(!swim) }
    for (const mesh of kit.trim) { mesh.material = trim; mesh.setEnabled(!swim) }
    for (const mesh of kit.trousers) { mesh.material = paint(trouserColor); mesh.setEnabled(!swim) }
    const sole = paint(Color3.FromHexString(shoeColor).scale(.67).toHexString())
    for (const mesh of kit.shoes) {
      mesh.material = mesh.name === 'Boot outsole' ? sole : paint(shoeColor)
      mesh.setEnabled(!bare)
    }
    for (const mesh of kit.bareFeet) { mesh.material = skin; mesh.setEnabled(bare) }
    for (const mesh of kit.swimCloth) { mesh.material = cloth; mesh.setEnabled(swim) }
    for (const mesh of kit.bareLimbs) { mesh.material = skin; mesh.setEnabled(swim) }
  }
  function setAppearance(appearance = defaultAppearance, { dye, base = id }: { dye?: string; base?: number } = {}) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin && lastBase === base &&
      lastDye === dye && appearancePartKeys.every(key => worn?.[key] === appearance[key])) return
    worn = appearance
    lastBase = base
    lastDye = dye
    dress(appearance, base, dye)
    const hat = isEveryday(appearance.uniform) ? appearance.hat ?? (wearsSwimsuit(appearance) ? 'none' : undefined) : undefined
    const palette = hat && hat !== 'none' ? everydayColors[hat] : uniformPalette(appearance.uniform, base)
    head.cap.material = paint(dye ?? palette.color)
    head.brim.material = paint(palette.trim)
    hatEquipped = hat !== 'none'
    fitHat()
    const brow = paint(hairColors[appearance.hairColor ?? 'chestnut'])
    for (const mesh of head.brows) mesh.material = brow
    head.nose.scaling.setAll(appearance.nose === 'small' ? .76 : 1)
    head.mouth.scaling.x = appearance.mouth === 'wide' ? 1.15 : 1
  }
  function blink(time: number) {
    const phase = (time + 4.1 + id * 1.59) % (5.8 + id * .47)
    const openness = Math.max(.06, Math.min(1, Math.abs(phase - .11) / .11))
    for (const eye of head.eyes) eye.scaling.y = openness * (worn?.eyes === 'narrow' ? .72 : 1)
  }
  setAppearance()
  return { root, arms: kit.arms, legs: kit.legs, setAppearance, blink, setCap }
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
