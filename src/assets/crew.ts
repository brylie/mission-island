import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { appearancePartKeys, defaultAppearance, everydayColors, hairColors, isEveryday, shirtColor, skinTones, uniformPalette, uniforms, wearsSwimsuit } from '../crew-appearance'
import type { CrewAppearance } from '../crew-appearance'
import { waterLevel } from '../terrain'
import { shopBottoms, shopShoes, shopTops, type StockId } from '../wardrobe-stock'
import { createShopAttachments, wornStock } from './shop-garments'
const cream = '#fff3d0'
const workwear = {
  courier: { trousers: '#334957', shoes: '#3d342c' },
  rescue: { trousers: '#47383a', shoes: '#252630' },
  angler: { trousers: '#303f50', shoes: '#4d3a30' },
}
const everydayBottoms: Record<Exclude<NonNullable<CrewAppearance['trousers']>, StockId<'trousers'>>, { color: string; cuff?: string }> = {
  slate: { color: '#36595e' },
  sand: { color: '#b79669' },
  'slate-shorts': { color: '#36595e', cuff: '#55747a' },
  'sand-shorts': { color: '#b79669', cuff: '#d8bb8f' },
}

export const playerColors = [uniforms.amber.color, uniforms.blue.color]
export const skiffCrewSeats = [new Vector3(-0.44, -0.39, 0.25), new Vector3(0.44, -0.39, 0.25)]

function createCrewLegs({ scene, sphere }: Pick<MeshFactory, 'scene' | 'sphere'>, root: TransformNode) {
  const legs: TransformNode[] = []
  const trousers: Mesh[] = []
  const shoes: Mesh[] = []
  const bareShins: Mesh[] = []
  const shorts: Mesh[] = []
  const rolledHems: Mesh[] = []
  for (const side of [-1, 1]) {
    const leg = new TransformNode('Hip', scene)
    leg.parent = root
    leg.position.set(side * 0.19, 0.68, 0.02)
    trousers.push(sphere(0, -0.27, 0, 0.31, 0.66, 0.32, '#36595e', leg, true, 12))
    shoes.push(sphere(0, -0.54, 0.10, 0.36, 0.28, 0.56, '#294343', leg, true, 12))
    shorts.push(sphere(0, -0.10, 0, 0.297, 0.39, 0.31, cream, leg, true, 12))
    rolledHems.push(sphere(0, -0.249, 0, 0.225, 0.103, 0.237, cream, leg, true, 12))
    bareShins.push(sphere(0, -0.408, 0.007, 0.20, 0.45, 0.22, cream, leg, true, 12))
    legs.push(leg)
  }
  return { legs, trousers, shoes, bareShins, shorts, rolledHems }
}


type BodyMeshes = ReturnType<typeof createCrewLegs> & {
  fabric: Mesh[]
  accents: Mesh[]
  skin: Mesh[]
  bareArms: Mesh[]
  torso: Mesh
  swimSeam: Mesh
}

function dressMeshes(parts: Mesh[], material: Mesh['material'], visible: boolean) {
  for (const part of parts) {
    part.material = material
    part.setEnabled(visible)
  }
}

function styleTop(parts: BodyMeshes, appearance: CrewAppearance, cloth: Mesh['material'], trim: Mesh['material'], tone: Mesh['material']) {
  const top = wornStock('shirt', appearance)
  const swimming = wearsSwimsuit(appearance)
  const sleeveless = swimming || Boolean(top && shopTops[top].sleeveless)
  dressMeshes([parts.torso], cloth, !top)
  dressMeshes(parts.fabric, cloth, !top && !swimming)
  dressMeshes(parts.accents, trim, !top && !swimming)
  dressMeshes([parts.swimSeam], trim, swimming)
  dressMeshes(parts.bareArms, tone, sleeveless)
  for (const mesh of parts.skin) mesh.material = tone
}

function styleBottoms(paint: MeshFactory['paint'], parts: BodyMeshes, appearance: CrewAppearance,
  swimsuitCloth: Mesh['material'], tone: Mesh['material'], uniformColor?: string) {
  const bottom = wornStock('trousers', appearance)
  const swimming = wearsSwimsuit(appearance)
  const cut = appearance.trousers
  const style = isEveryday(appearance.uniform) && (cut === 'sand' || cut === 'slate-shorts' || cut === 'sand-shorts')
    ? everydayBottoms[cut] : everydayBottoms.slate
  const cuff = !swimming && style.cuff
  const shorts = swimming || Boolean(cuff) || Boolean(bottom && shopBottoms[bottom].short)
  const cloth = paint(uniformColor ?? style.color)
  dressMeshes(parts.trousers, cloth, !bottom && !shorts)
  dressMeshes(parts.shorts, swimming ? swimsuitCloth : cloth, !bottom && shorts)
  dressMeshes(parts.rolledHems, cuff ? paint(cuff) : cloth, !bottom && Boolean(cuff))
  dressMeshes(parts.bareShins, tone, shorts)
}

function styleShoes(paint: MeshFactory['paint'], shoes: Mesh[], appearance: CrewAppearance, tone: Mesh['material'], uniformColor?: string) {
  const footwear = wornStock('shoes', appearance)
  const open = Boolean(footwear && shopShoes[footwear].open)
  const barefoot = open || (isEveryday(appearance.uniform) &&
    (appearance.shoes === 'bare' || (wearsSwimsuit(appearance) && !appearance.shoes)))
  const color = uniformColor ?? (appearance.shoes === 'brown' ? '#76523a' : '#294343')
  dressMeshes(shoes, barefoot ? tone : paint(color), !footwear || open)
  for (const shoe of shoes) {
    shoe.position.y = barefoot ? -.58 : -.54
    shoe.scaling.set(barefoot ? .255 : .36, barefoot ? .19 : .28, barefoot ? .41 : .56)
  }
}

function createBodyStyle(paint: MeshFactory['paint'], parts: BodyMeshes) {
  return (appearance: CrewAppearance, base: number, dye?: string) => {
    const palette = shirtColor(appearance, base)
    const tone = paint(skinTones[appearance.skin === 'default' ? (base === 0 ? 'light' : 'medium') : appearance.skin].color)
    const { uniform } = appearance
    const work = uniform === 'courier' || uniform === 'rescue' || uniform === 'angler' ? workwear[uniform] : undefined
    const cloth = paint(dye ?? palette.color)
    styleTop(parts, appearance, cloth, paint(palette.trim), tone)
    styleBottoms(paint, parts, appearance, cloth, tone, work?.trousers)
    styleShoes(paint, parts.shoes, appearance, tone, work?.shoes)
  }
}

export function createCrew(meshes: MeshFactory, id: number) {
  const { scene, sphere, paint } = meshes
  const root = new TransformNode(`Crew ${id + 1}`, scene)
  const legMeshes = createCrewLegs({ scene, sphere }, root)
  const { legs } = legMeshes
  const arms: TransformNode[] = []
  const fabric: Mesh[] = []
  const accents: Mesh[] = []
  const skin: Mesh[] = []
  const bareArms: Mesh[] = []
  const eyes: { mesh: Mesh; height: number }[] = []
  for (const side of [-1, 1]) {
    const arm = new TransformNode('Shoulder', scene)
    arm.parent = root
    arm.position.set(side * 0.36, 1.19, 0.03)
    const sleeve = sphere(side * 0.075, -0.22, 0, 0.27, 0.58, 0.28, cream, arm, true, 12)
    sleeve.rotation.z = side * 0.18
    fabric.push(sleeve)
    const upperArm = sphere(side * 0.071, -0.218, 0.005, 0.183, 0.56, 0.198, cream, arm, true, 12)
    upperArm.rotation.z = sleeve.rotation.z
    bareArms.push(upperArm)
    accents.push(sphere(side * 0.11, -0.44, 0, 0.225, 0.11, 0.24, cream, arm))
    skin.push(sphere(side * 0.12, -0.53, 0.017, 0.205, 0.24, 0.22, cream, arm, true, 10))
    arms.push(arm)
  }
  const torso = sphere(0, 0.98, 0, 0.82, 0.79, 0.59, cream, root, true, 16)
  const swimSeam = sphere(0, 1.205, 0.222, 0.43, 0.068, 0.076, cream, root, true, 12)
  accents.push(sphere(0, 1.23, 0.167, 0.38, 0.12, 0.31, cream, root))
  accents.push(sphere(-0.163, 1.107, 0.245, 0.16, 0.138, 0.082, cream, root))

  skin.push(sphere(0, 1.46, 0.046, 0.56, 0.56, 0.55, cream, root, true, 18))
  const nose = sphere(0, 1.455, 0.303, 0.13, 0.112, 0.12, cream, root, false, 10)
  skin.push(nose)
  for (const side of [-1, 1]) {
    skin.push(sphere(side * 0.264, 1.46, 0.066, 0.12, 0.17, 0.1, cream, root))
    const white = sphere(side * 0.105, 1.511, 0.296, 0.093, 0.11, 0.048, '#fff4e2', root, false, 10)
    const pupil = sphere(side * 0.105, 1.507, 0.319, 0.049, 0.065, 0.027, '#3c3931', root, false, 10)
    eyes.push({ mesh: white, height: white.scaling.y }, { mesh: pupil, height: pupil.scaling.y })
  }
  const mouth = sphere(0, 1.366, 0.296, 0.135, 0.025, 0.033, '#754d43', root, false, 10)
  const hair = sphere(0, 1.57, -0.042, 0.55, 0.37, 0.51, hairColors.chestnut, root, true, 16)
  const cap = sphere(0, 1.712, 0.016, 0.61, 0.31, 0.6, cream, root, true, 16)
  const brim = sphere(0, 1.654, 0.185, 0.615, 0.068, 0.53, cream, root, true, 16)

  const dress = createBodyStyle(paint, { ...legMeshes, fabric, accents, skin, bareArms, torso, swimSeam })
  const shop = createShopAttachments(meshes, { root, arms, legs })

  let hatEquipped = true
  let showCap = true
  function positionHat() {
    const visible = showCap && hatEquipped
    const stocked = shop.setHatVisible(visible)
    cap.setEnabled(visible && !stocked)
    brim.setEnabled(visible && !stocked)
    hair.position.y = visible ? 1.537 : 1.57
    hair.scaling.set(0.55, visible ? 0.29 : 0.37, visible ? 0.46 : 0.51)
  }

  function setCap(visible: boolean) {
    if (showCap === visible) return
    showCap = visible
    positionHat()
  }

  function styleHead(appearance: CrewAppearance, base: number, dye?: string) {
    const hat = isEveryday(appearance.uniform) ? appearance.hat ?? (wearsSwimsuit(appearance) ? 'none' : undefined) : undefined
    const capPalette = hat === 'amber' || hat === 'blue' ? everydayColors[hat] : uniformPalette(appearance.uniform, base)
    cap.material = paint(dye ?? capPalette.color)
    brim.material = paint(capPalette.trim)
    hatEquipped = hat !== 'none'
    hair.setEnabled(appearance.hair === 'short')
    hair.material = paint(hairColors[appearance.hairColor ?? 'chestnut'])
    positionHat()
    const noseSize = appearance.nose === 'small' ? 0.76 : 1
    nose.scaling.set(0.13 * noseSize, 0.112 * noseSize, 0.12 * noseSize)
    mouth.scaling.x = appearance.mouth === 'wide' ? 0.18 : 0.135
  }

  let worn: CrewAppearance | undefined
  let lastDye: string | undefined
  let lastBase = id
  function setAppearance(appearance = defaultAppearance,
    { dye, base = id }: { dye?: string; base?: number } = {}) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin && lastDye === dye &&
      lastBase === base && appearancePartKeys.every(key => worn?.[key] === appearance[key])) return
    lastDye = dye
    lastBase = base
    worn = appearance
    shop.sync(appearance)
    dress(appearance, base, dye)
    styleHead(appearance, base, dye)
  }
  function blink(time: number) {
    const phase = (time + 4.1 + id * 1.59) % (5.8 + id * 0.47)
    const openness = Math.max(0.08, Math.min(1, Math.abs(phase - 0.11) / 0.11))
    const shape = worn?.eyes === 'narrow' ? 0.72 : 1
    for (const { mesh, height } of eyes) mesh.scaling.y = height * openness * shape
  }
  setAppearance()
  return { root, arms, legs, setAppearance, blink, setCap }
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
