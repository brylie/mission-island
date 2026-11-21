import { Color3 } from '@babylonjs/core/Maths/math.color'
import { isStockPiece, shopBottoms, shopShoes, shopTops } from '../wardrobe-stock'
import { createShopAttachments, wornStock } from './shop-garments'
import { rigCrewKnee } from './crew-knee'
import { createCrewClothes } from './crew-clothes'
import { createCrewHead } from './crew-head'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { appearancePartKeys, defaultAppearance, everydayColors, hairColors, isEveryday, shirtColor, skinTones, uniformPalette, uniforms, wearsSwimsuit } from '../crew-appearance'
import type { CrewAppearance } from '../crew-appearance'
import { crewHeadFit } from './geometry/crew-face'

export { createFarmTools, createSkiffGear, paddleBladeOffset, skiffCrewSeats, wateringRoseOffset } from './crew-equipment'
export { poseCrew, poseSkiffCrew, poseSwimming, swimmingHeight } from './crew-poses'

const workwear = {
  courier: { trousers: '#414e64', shoes: '#75533d' },
  rescue: { trousers: '#47383a', shoes: '#252630' },
  angler: { trousers: '#303f50', shoes: '#4d3a30' },
}

const slateTrouserDye = '#617c90'
const sandTrouserDye = '#bd9b6e'
const everydayTrousers = { 'default': '#405464', 'slate': slateTrouserDye, 'sand': sandTrouserDye, 'slate-shorts': slateTrouserDye, 'sand-shorts': sandTrouserDye }

export const playerColors = [uniforms.amber.color, uniforms.blue.color]

const outsoleShade = 0.67
const noseGreenScale = 0.95
const noseBlueScale = 0.94
const lipRedScale = 0.62
const lipGreenScale = 0.57
const lipBlueScale = 0.56
const yokeShade = 0.81
const collarShade = 0.90
const browShade = 0.78
const smallNoseScale = 0.76
const noseHeightRatio = 0.83

const breathSpeed = 1.65
const breathPhasePerCrew = 2.1
const breathTravel = 0.004
const breathNod = 0.009
const idleLookYaw = 0.027
const idleLookSpeed = 0.81
const blinkStartOffset = 4.1
const blinkPhasePerCrew = 1.59
const blinkInterval = 5.8
const blinkIntervalPerCrew = 0.47
const blinkHalfDuration = 0.11
const closedEyeScale = 0.20
const narrowEyeScale = 0.72

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
  const kit = createCrewClothes(meshes, root)
  const knees = kit.legs.map(rigCrewKnee)
  const head = createCrewHead(meshes, root, kit.skin)
  const shop = createShopAttachments(meshes, { root, head: head.pivot, arms: kit.arms, legs: kit.legs, knees: knees.map((knee) => knee.skeleton) })
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
    const sole = paint(Color3.FromHexString(shoeColor).scale(outsoleShade).toHexString())
    for (const mesh of kit.shoes) {
      mesh.material = mesh.name === 'Boot outsole' ? sole : paint(shoeColor)
      mesh.setEnabled(!bare && !customShoe)
    }
    for (const mesh of kit.bareFeet) {
      mesh.material = skin
      mesh.setEnabled(bare && !calvesVisible)
    }
    for (const mesh of kit.swimCalves) {
      mesh.material = skin
      mesh.setEnabled(calvesVisible && !bare)
    }
    for (const mesh of kit.swimBareFeet) {
      mesh.material = skin
      mesh.setEnabled(calvesVisible && bare)
    }
  }
  function dressBottoms(appearance: CrewAppearance, skin: ReturnType<typeof paint>, swim: boolean, bare: boolean) {
    const { trouserColor, shoeColor, cuff } = legPalette(appearance)
    const bottom = wornStock('trousers', appearance)
    const footwear = wornStock('shoes', appearance)
    const short = Boolean(cuff) && !swim
    for (const mesh of kit.trousers) {
      mesh.material = paint(trouserColor)
      mesh.setEnabled(!swim && !short && !bottom)
    }
    kit.seat.material = paint(trouserColor)
    kit.seat.setEnabled(!swim && !bottom)
    for (const mesh of kit.shorts) {
      mesh.material = paint(trouserColor)
      mesh.setEnabled(short)
    }
    for (const mesh of kit.shortCuffs) {
      if (cuff) mesh.material = paint(cuff)
      mesh.setEnabled(short)
    }
    dressFeet(shoeColor, skin, swim || short || Boolean(bottom && shopBottoms[bottom].short), bare || Boolean(footwear && shopShoes[footwear].open), Boolean(footwear))
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
    const warm = paint(new Color3(complexion.r, complexion.g * noseGreenScale, complexion.b * noseBlueScale).toHexString())
    const lips = paint(new Color3(complexion.r * lipRedScale, complexion.g * lipGreenScale, complexion.b * lipBlueScale).toHexString())
    head.smile.material = lips
    head.grin.material = lips
    for (const mesh of kit.skin) mesh.material = skin
    head.nose.material = warm
    const top = wornStock('shirt', appearance)
    const shirted = !swim && !top
    const sleeveless = swim || Boolean(top && shopTops[top].sleeveless)
    const canvas = Color3.FromHexString(dye ?? shirt.color)
    kit.yoke.material = paint(canvas.scale(yokeShade).toHexString())
    kit.yoke.setEnabled(shirted)
    kit.torso.setEnabled(shirted)
    kit.torso.material = cloth
    kit.inset.setEnabled(shirted)
    kit.swimSeam.material = trim
    kit.swimSeam.setEnabled(swim)
    for (const mesh of kit.cloth) {
      mesh.material = mesh.name === 'Folded canvas collar' ? paint(canvas.scale(collarShade).toHexString()) : cloth
      mesh.setEnabled(shirted)
    }
    for (const mesh of kit.shoulders) {
      mesh.material = cloth
      mesh.setEnabled(!sleeveless)
    }
    for (const mesh of kit.shirtedSkin) {
      mesh.material = skin
      mesh.setEnabled(!sleeveless)
    }
    for (const mesh of kit.trim) {
      mesh.material = trim
      mesh.setEnabled(shirted)
    }
    dressBottoms(appearance, skin, swim, bare)
    kit.swimsuit.mesh.material = cloth
    kit.swimsuit.mesh.setEnabled(swim)
    for (const mesh of kit.bareLimbs) {
      mesh.material = skin
      mesh.setEnabled(sleeveless)
    }
  }
  function setAppearance(appearance = defaultAppearance, { dye, base = id }: { dye?: string, base?: number } = {}) {
    if (worn?.uniform === appearance.uniform && worn.skin === appearance.skin && lastBase === base
      && lastDye === dye && appearancePartKeys.every((key) => worn?.[key] === appearance[key])) return
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
    const brow = paint(browColor.scale(browShade).toHexString())
    for (const mesh of head.brows) mesh.material = brow
    const noseSize = appearance.nose === 'small' ? smallNoseScale : 1
    head.nose.scaling.set(noseSize, noseSize * noseHeightRatio, noseSize)
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
    const breath = Math.sin(time * breathSpeed + id * breathPhasePerCrew)
    // Keep the collar and grips fixed; only the head settles with each breath.
    head.pivot.position.y = crewHeadFit.position[1] + breathTravel * breath
    breathPitch = breathNod * breath
    idleYaw = idleLookYaw * Math.sin(time * idleLookSpeed + id)
    head.pivot.rotation.set(lookDown + breathPitch, lookSide + idleYaw, headRoll)
    const phase = (time + blinkStartOffset + id * blinkPhasePerCrew) % (blinkInterval + id * blinkIntervalPerCrew)
    const openness = Math.min(1, Math.abs(phase - blinkHalfDuration) / blinkHalfDuration)
    const closed = openness < closedEyeScale
    for (const { pivot, fill } of head.eyes) {
      // At full closure only the upper lash is visible.
      if (fill.isEnabled() === closed) fill.setEnabled(!closed)
      pivot.scaling.y = Math.max(closedEyeScale, openness) * (worn?.eyes === 'narrow' ? narrowEyeScale : 1)
    }
  }
  function fitSwimwear() {
    if (!worn) return
    kit.swimsuit.fitPose()
    for (const arm of kit.swimArms) arm.fitPose()
  }
  setAppearance()
  return { root, arms: kit.arms, legs: kit.legs, setAppearance, blink, setCap, fitSwimwear, knees: knees.map((knee) => knee.bend), look }
}
