import { Color3 } from '@babylonjs/core/Maths/math.color'
import { isStockPiece, shopBottoms, shopShoes, shopTops } from '../wardrobe-stock'
import { createShopAttachments, wornStock } from './shop-garments'
import { rigCrewKnee } from './crew-knee'
import { createCrewClothes } from './crew-clothes'
import { fitCrewGait, relaxCrewGait } from './crew-gait-pose'
import type { CrewGaitPose } from '../crew-gait'
import { createCrewHead } from './crew-head'
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
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

const everydayTrousers = { default: '#405464', slate: '#617c90', sand: '#bd9b6e', 'slate-shorts': '#617c90', 'sand-shorts': '#bd9b6e' }

export const playerColors = [uniforms.amber.color, uniforms.blue.color]
export const skiffCrewSeats = [new Vector3(-0.44, -0.39, 0.25), new Vector3(0.44, -0.39, 0.25)]

function legPalette(appearance: CrewAppearance) {
  const job = appearance.uniform === 'courier' || appearance.uniform === 'rescue' || appearance.uniform === 'angler' ? workwear[appearance.uniform] : undefined
  const cut = appearance.trousers
  const trouserColor = job?.trousers ?? (isStockPiece('trousers', cut) ? shopBottoms[cut].color : everydayTrousers[cut ?? 'default'])
  const shoeColor = job?.shoes ?? (appearance.shoes === 'brown' ? '#76523a' : '#394847')
  const cuff = job ? undefined : appearance.trousers === 'slate-shorts' ? '#8197a7' : appearance.trousers === 'sand-shorts' ? '#d8bb8f' : undefined
  return { trouserColor, shoeColor, cuff }
}

export function createCrew(meshes: MeshFactory, id: number) {
  const root = new TransformNode(`Crew ${id + 1}`, meshes.scene)
  const body = new TransformNode('Crew body', meshes.scene)
  body.parent = root
  const kit = createCrewClothes(meshes, body)
  const knees = kit.legs.map(rigCrewKnee)
  const head = createCrewHead(meshes, body, kit.skin)
  const shop = createShopAttachments(meshes, { root: body, head: head.pivot, arms: kit.arms, legs: kit.legs, knees: knees.map(knee => knee.skeleton) })
  const { paint } = meshes
  let showCap = true, hatEquipped = true
  let worn: CrewAppearance | undefined
  let lastBase = id, lastDye: string | undefined

  function fitHat() {
    const visible = showCap && hatEquipped
    const stockHat = shop.setHatVisible(visible)
    head.cap.setEnabled(visible && !stockHat)
    head.brim.setEnabled(visible && !stockHat)
    head.hair(hairColors[worn?.hairColor ?? 'chestnut'], worn?.hair ?? 'short', visible, visible && worn?.hat === 'reed-crown' && stockHat)
  }
  function setCap(visible: boolean) {
    if (showCap === visible) return
    showCap = visible
    fitHat()
  }
  function dressFeet(shoeColor: string, skin: ReturnType<typeof paint>, calvesVisible: boolean, bare: boolean, customShoe: boolean) {
    const sole = paint(Color3.FromHexString(shoeColor).scale(.67).toHexString())
    for (const mesh of kit.shoes) {
      mesh.material = mesh.name === 'Boot outsole' ? sole : paint(shoeColor)
      mesh.setEnabled(!bare && !customShoe)
    }
    for (const mesh of kit.bareFeet) { mesh.material = skin; mesh.setEnabled(bare && !calvesVisible) }
    for (const mesh of kit.swimCalves) { mesh.material = skin; mesh.setEnabled(calvesVisible && !bare) }
    for (const mesh of kit.swimBareFeet) { mesh.material = skin; mesh.setEnabled(calvesVisible && bare) }
  }
  function dressBottoms(appearance: CrewAppearance, skin: ReturnType<typeof paint>, swim: boolean, bare: boolean) {
    const { trouserColor, shoeColor, cuff } = legPalette(appearance)
    const bottom = wornStock('trousers', appearance)
    const footwear = wornStock('shoes', appearance)
    const short = Boolean(cuff) && !swim
    for (const mesh of kit.trousers) { mesh.material = paint(trouserColor); mesh.setEnabled(!swim && !short && !bottom) }
    kit.seat.material = paint(trouserColor)
    kit.seat.setEnabled(!swim && !bottom)
    for (const mesh of kit.shorts) { mesh.material = paint(trouserColor); mesh.setEnabled(short) }
    for (const mesh of kit.shortCuffs) { if (cuff) mesh.material = paint(cuff); mesh.setEnabled(short) }
    dressFeet(shoeColor, skin, swim || short || Boolean(bottom && shopBottoms[bottom].short),
      bare || Boolean(footwear && shopShoes[footwear].open), Boolean(footwear))
  }
  function dress(appearance: CrewAppearance, base: number, dye?: string) {
    const everyday = isEveryday(appearance.uniform)
    const swim = wearsSwimsuit(appearance)
    const bare = everyday && (appearance.shoes === 'bare' || (swim && !appearance.shoes))
    const shirt = shirtColor(appearance, base)
    const cloth = paint(dye ?? shirt.color), trim = paint(shirt.trim)
    const tone = skinTones[appearance.skin === 'default' ? (base === 0 ? 'light' : 'medium') : appearance.skin].color
    const skin = paint(tone)
    const complexion = Color3.FromHexString(tone)
    const warm = paint(new Color3(complexion.r, complexion.g * .95, complexion.b * .94).toHexString())
    const lips = paint(new Color3(complexion.r * .62, complexion.g * .57, complexion.b * .56).toHexString())
    head.smile.material = lips
    head.grin.material = lips
    for (const mesh of kit.skin) mesh.material = skin
    head.nose.material = warm
    const top = wornStock('shirt', appearance)
    const shirted = !swim && !top
    const sleeveless = swim || Boolean(top && shopTops[top].sleeveless)
    const canvas = Color3.FromHexString(dye ?? shirt.color)
    kit.yoke.material = paint(canvas.scale(.81).toHexString())
    kit.yoke.setEnabled(shirted)
    kit.torso.setEnabled(shirted)
    kit.torso.material = cloth
    kit.inset.setEnabled(shirted)
    kit.swimSeam.material = trim
    kit.swimSeam.setEnabled(swim)
    for (const mesh of kit.cloth) { mesh.material = mesh.name === 'Folded canvas collar' ? paint(canvas.scale(.90).toHexString()) : cloth; mesh.setEnabled(shirted) }
    for (const mesh of kit.shoulders) { mesh.material = cloth; mesh.setEnabled(!sleeveless) }
    for (const mesh of kit.shirtedSkin) { mesh.material = skin; mesh.setEnabled(!sleeveless) }
    for (const mesh of kit.trim) { mesh.material = trim; mesh.setEnabled(shirted) }
    dressBottoms(appearance, skin, swim, bare)
    kit.swimsuit.mesh.material = cloth
    kit.swimsuit.mesh.setEnabled(swim)
    for (const mesh of kit.bareLimbs) { mesh.material = skin; mesh.setEnabled(sleeveless) }
  }
  function setAppearance(appearance = defaultAppearance, { dye, base = id }: { dye?: string; base?: number } = {}) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin && lastBase === base &&
      lastDye === dye && appearancePartKeys.every(key => worn?.[key] === appearance[key])) return
    worn = appearance
    lastBase = base
    lastDye = dye
    shop.sync(appearance, dye)
    dress(appearance, base, dye)
    const hat = isEveryday(appearance.uniform) ? appearance.hat ?? (wearsSwimsuit(appearance) ? 'none' : undefined) : undefined
    const palette = (hat === 'blue' || hat === 'amber') ? everydayColors[hat] : uniformPalette(appearance.uniform, base)
    head.cap.material = paint(dye ?? palette.color)
    head.brim.material = paint(palette.trim)
    hatEquipped = hat !== 'none'
    fitHat()
    const browColor = Color3.FromHexString(hairColors[appearance.hairColor ?? 'chestnut'])
    const brow = paint(browColor.scale(.78).toHexString())
    for (const mesh of head.brows) mesh.material = brow
    const noseSize = appearance.nose === 'small' ? .76 : 1
    head.nose.scaling.set(noseSize, noseSize * .83, noseSize)
    const wideSmile = appearance.mouth === 'wide'
    head.smile.setEnabled(!wideSmile)
    head.grin.setEnabled(wideSmile)
    fitSwimwear()
  }
  let lookDown = 0, lookSide = 0, headRoll = 0, breathPitch = 0, idleYaw = 0
  function look(pitch: number, yaw: number, roll: number, blend: number) {
    lookDown += (pitch - lookDown) * blend
    lookSide += (yaw - lookSide) * blend
    headRoll += (roll - headRoll) * blend
    head.pivot.rotation.set(lookDown + breathPitch, lookSide + idleYaw, headRoll)
  }
  function blink(time: number) {
    const breath = Math.sin(time * 1.65 + id * 2.1)
    // Keep the collar and grips fixed; only the head settles with each breath.
    head.pivot.position.y = 1.315 + .004 * breath
    breathPitch = .009 * breath
    idleYaw = .027 * Math.sin(time * .81 + id)
    head.pivot.rotation.set(lookDown + breathPitch, lookSide + idleYaw, headRoll)
    const phase = (time + 4.1 + id * 1.59) % (5.8 + id * .47)
    const openness = Math.min(1, Math.abs(phase - .11) / .11)
    const closed = openness < .20
    for (const { pivot, fill } of head.eyes) {
      // At full closure only the upper lash is visible.
      if (fill.isEnabled() === closed) fill.setEnabled(!closed)
      pivot.scaling.y = Math.max(.20, openness) * (worn?.eyes === 'narrow' ? .72 : 1)
    }
  }
  function fitSwimwear() {
    if (!worn) return
    kit.swimsuit.fitPose()
    for (const arm of kit.swimArms) arm.fitPose()
  }
  setAppearance()
  return { root, body, arms: kit.arms, legs: kit.legs, setAppearance, blink, setCap, fitSwimwear, knees, look }
}

export function poseCrew(crew: ReturnType<typeof createCrew>, gait: number | CrewGaitPose, stride: number, airborne: boolean,
  carrying?: 'crate' | 'extinguisher' | 'toolbox' | 'tool', reach = 0, blend = 1, winding = 0, throwing = false, rightHandRaised = false) {
  const phase = (typeof gait === 'number' ? gait : gait.cycle) * Math.PI * 2
  const swing = Math.sin(phase) * stride
  const effort = Math.max(reach, Number(rightHandRaised), winding)
  crew.look(airborne ? -.06 : (carrying === 'crate' ? .13 : effort * .07),
    (Number(rightHandRaised) - reach) * .09, -.042 * swing, blend)
  if (typeof gait === 'number') relaxCrewGait(crew, blend)
  else fitCrewGait(crew, gait)
  for (const [i, leg] of crew.legs.entries()) {
    const side = i === 0 ? -1 : 1
    if (typeof gait === 'number') {
      const recovery = Math.max(0, -side * Math.cos(phase))
      const bend = airborne ? .46 - side * .19 : stride * (.08 + .88 * recovery * recovery)
      leg.rotation.x += ((airborne ? side * .35 : swing * side - bend * .36) - leg.rotation.x) * blend
      crew.knees[i].bend(bend, blend)
    }
    const arm = crew.arms[i]
    arm.rotation.z *= 1 - blend
    const swinging = airborne ? -0.8 : -swing * side * 0.77
    const relaxed = throwing ? -1.75 : carrying === 'crate' ? -1.22 - winding * 0.67
      : (carrying === 'extinguisher' || carrying === 'tool') && i === 0 ? -1.36 : swinging
    const reachAmount = i === 0 ? reach : Number(rightHandRaised)
    const forward = relaxed + (-Math.PI / 2 - relaxed) * reachAmount
    arm.rotation.x += (forward - arm.rotation.x) * blend
  }
  crew.fitSwimwear()
}

export function poseSwimming(crew: ReturnType<typeof createCrew>, time: number, speed: number, blend = 1) {
  relaxCrewGait(crew, blend)
  const stroke = time * Math.PI * 2 / 1.6
  crew.root.rotation.x = .06 + .22 * speed
  crew.look(-crew.root.rotation.x * .64, .025 * Math.sin(stroke), 0, blend)
  for (const [i, arm] of crew.arms.entries()) {
    const side = i === 0 ? -1 : 1
    const reach = -.86 - Math.cos(stroke) * (.2 + .46 * speed)
    const sweep = side * (.7 + Math.sin(stroke) * .44)
    arm.rotation.x += (reach - arm.rotation.x) * blend
    arm.rotation.z += (sweep - arm.rotation.z) * blend
    const kick = .5 + .5 * Math.cos(stroke)
    crew.legs[i].rotation.x = .21 - kick * (.18 + .21 * speed) + side * .05 * Math.sin(stroke)
    crew.knees[i].bend(.13 + kick * (.33 + .42 * speed), blend)
  }
  crew.fitSwimwear()
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
  relaxCrewGait(crew, blend)
  crew.look(fishing ? .10 : .055 + stroke * .035, side * (fishing ? .15 : .07 * stroke), 0, blend)
  for (const [i, leg] of crew.legs.entries()) {
    crew.knees[i].bend(1.05, blend)
    leg.rotation.x += (-1.27 - leg.rotation.x) * blend
    const arm = crew.arms[i]
    const outerArm = i === (side < 0 ? 0 : 1)
    const across = fishing ? 0 : side * (outerArm ? .38 : .96)
    arm.rotation.z += (across - arm.rotation.z) * blend
    const pose = fishing ? (outerArm ? -1.39 : -1.07) : outerArm ? -.58 + stroke * .60 : -1.88 + stroke * .35
    arm.rotation.x += (pose - arm.rotation.x) * blend
  }
  crew.fitSwimwear()
}

export function createSkiffGear({ scene, box, cylinder, sphere }: MeshFactory, character: ReturnType<typeof createCrew>) {
  const inverseGrip = Matrix.Identity(), toOtherHand = Vector3.Zero()
  const up = Vector3.Up()
  const gear = [-1, 1].map((side, i) => {
    const grip = new TransformNode('Skiff gear', scene)
    grip.parent = character.arms[i]
    grip.position.set(side * 0.12, -0.53, 0.017)
    const paddle = new TransformNode('Paddle', scene)
    paddle.parent = grip
    paddle.rotationQuaternion = Quaternion.Identity()
    cylinder(0, .12, 0, 0.052, 0.052, 1.98, 8, '#8f6746', paddle)
    box(0, -0.96, 0, 0.25, 0.4, 0.068, '#c29862', paddle)
    const rod = new TransformNode('Fishing rod', scene)
    rod.parent = grip
    cylinder(0, -0.6, 0, 0.04, 0.013, 1.65, 8, '#496552', rod)
    sphere(0, -0.12, 0.06, 0.13, 0.12, 0.09, '#cbd4bd', rod, false)
    grip.setEnabled(false)
    return { grip, paddle, rod }
  })
  return gear.map((tool, i) => ({
    ...tool,
    alignPaddle: () => {
      tool.grip.computeWorldMatrix(true).invertToRef(inverseGrip)
      const opposite = gear[1 - i].grip
      opposite.computeWorldMatrix(true)
      Vector3.TransformCoordinatesToRef(opposite.absolutePosition, inverseGrip, toOtherHand)
      Quaternion.FromUnitVectorsToRef(up, toOtherHand.normalize(), tool.paddle.rotationQuaternion!)
    },
  }))
}
