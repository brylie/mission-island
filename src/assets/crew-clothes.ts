import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { garment, sweptDetail } from './crew-shapes'
import { createSwimArm } from './crew-swim-arm'
import { createSwimsuit } from './crew-swimsuit'
import { crewArmClothing, crewExposedSkin, crewLegClothing, crewShirt } from './geometry/crew-clothing'
import { crewSwimsuit } from './geometry/crew-swimwear'

type Contour = Parameters<typeof garment>[4]
const clothSoftness = 0.88

function mirrorContour(rows: Contour, side: number): Contour {
  return rows.map(([y, x, z, halfWidth, halfDepth]) => [y, side * x, z, halfWidth, halfDepth])
}

export function createCrewClothes(meshes: MeshFactory, root: TransformNode) {
  const blank = '#f1d6a2'
  const skin: Mesh[] = [], cloth: Mesh[] = [], trim: Mesh[] = [], trousers: Mesh[] = [], shoes: Mesh[] = []
  const shorts: Mesh[] = [], shortCuffs: Mesh[] = []
  const bareFeet: Mesh[] = [], bareLimbs: Mesh[] = [], shirtedSkin: Mesh[] = []
  const swimCalves: Mesh[] = [], swimBareFeet: Mesh[] = []
  const arms: TransformNode[] = [], legs: TransformNode[] = [], shoulders: Mesh[] = []
  const swimArms: ReturnType<typeof createSwimArm>[] = []
  const form = (parent: TransformNode, name: string, rows: Contour, softness: number = clothSoftness) =>
    garment(meshes, parent, name, blank, rows, softness)
  const { pivot: hipPivot, trouserLeg, trouserHem, deckShorts, shortCuff, boot, bootOutsole, bareFoot, swimCalf, swimBareFoot } = crewLegClothing
  const { pivot: armPivot, shoulder, sleeve, cuff, thumb } = crewArmClothing

  for (const side of [-1, 1]) {
    const leg = new TransformNode('Hip', meshes.scene)
    leg.parent = root
    leg.position.set(side * hipPivot.x, hipPivot.y, hipPivot.z)
    legs.push(leg)
    const [waistHeight, ...waistSection] = trouserLeg.waist
    const trouserRows: Contour = [...trouserLeg.contour, [waistHeight + side * trouserLeg.waistRiseOffset, ...waistSection]]
    trousers.push(form(leg, 'Twill trouser leg', mirrorContour(trouserRows, side)))
    trousers.push(form(leg, 'Folded trouser hem', mirrorContour(trouserHem, side)))
    shorts.push(form(leg, 'Deck shorts', mirrorContour(deckShorts, side)))
    shortCuffs.push(form(leg, 'Rolled shorts cuff', mirrorContour(shortCuff, side)))
    shoes.push(form(leg, 'Oiled leather boot', mirrorContour(boot, side)))
    shoes.push(form(leg, 'Boot outsole', mirrorContour(bootOutsole.contour, side), bootOutsole.softness))
    bareFeet.push(form(leg, 'Bare foot', mirrorContour(bareFoot, side)))
    swimCalves.push(form(leg, 'Calf above swimming shoes', mirrorContour(swimCalf, side)))
    swimBareFeet.push(form(leg, 'Bare calf and foot', mirrorContour(swimBareFoot, side)))

    const arm = new TransformNode('Shoulder', meshes.scene)
    arm.parent = root
    arm.position.set(side * armPivot.x, armPivot.y, armPivot.z)
    arms.push(arm)
    // Keep a rounded shoulder across the rotating sleeve and the stationary torso.
    shoulders.push(meshes.sphere(side * shoulder.x, shoulder.y, shoulder.z, shoulder.width, shoulder.height, shoulder.depth, blank, root, false, shoulder.segments))
    cloth.push(form(arm, 'Sloping shirt sleeve', mirrorContour(sleeve, side)))
    trim.push(form(arm, 'Rolled cuff', mirrorContour(cuff, side)))
    const forearm = mirrorContour(crewArmClothing.forearm, side)
    shirtedSkin.push(form(arm, 'Shirted forearm and palm', forearm))
    const swimArm = createSwimArm(meshes, root, arm, side, blank, forearm)
    swimArms.push(swimArm)
    bareLimbs.push(swimArm.mesh)
    skin.push(sweptDetail(meshes, arm, 'Opposing thumb', blank, thumb.path.map(([x, y, z, width, thickness]) => [side * x, y, z, width, thickness]), thumb.normal))
  }

  const { torso: torsoContour, yoke: backYoke, neckband, collar: collarGeometry, linenInset, pocket: pocketGeometry, buttons } = crewShirt
  const seat = form(root, 'Trouser seat', crewLegClothing.seat)
  const torso = form(root, 'Canvas shirt body', torsoContour)
  const yoke = sweptDetail(meshes, root, 'Back yoke seam', blank, backYoke.path, backYoke.normal, backYoke.sides)
  const swimsuit = createSwimsuit(meshes, root, legs, blank)
  // The exposed skin across the collarbone fills the neckline and joins the deltoids.
  const { neck, swimCollarbone } = crewExposedSkin
  bareLimbs.push(form(root, 'Swim shoulder and collarbone line', swimCollarbone.contour, swimCollarbone.softness))
  for (const part of bareLimbs) part.receiveShadows = false
  skin.push(form(root, 'Neck', neck))
  cloth.push(form(root, 'Neckband', neckband))
  // The two broad collar points follow the shoulder slope. Visible faces have their own folded edge.
  for (const side of [-1, 1]) {
    const coords = collarGeometry.corners.flatMap(([x, y, z]) => [side * x, y, z])
    const indices = [...collarGeometry.triangles]
    const collar = meshes.surface('Turned collar', coords, side > 0 ? indices : indices.reverse(), blank, root)
    collar.name = 'Folded canvas collar'
    cloth.push(collar)
    // Show the underside when the camera looks up under a collar point.
    const underside = collarGeometry.corners.flatMap(([x, y, z]) => [side * x, y, z - collarGeometry.undersideInset])
    cloth.push(meshes.surface('Collar underside', underside, indices.slice().reverse(), blank, root))
  }
  const inset = meshes.surface('Linen undershirt', [...linenInset.positions], [...linenInset.triangles], linenInset.color, root)
  const pocket = form(root, 'Stitched pocket', pocketGeometry.contour)
  pocket.position.z = pocketGeometry.z
  pocket.rotation.y = pocketGeometry.heading
  cloth.push(pocket)
  for (const [y, z] of buttons.placements) {
    trim.push(meshes.sphere(buttons.x, y, z, buttons.diameter, buttons.diameter, buttons.depth, blank, root, false, buttons.segments))
  }
  const { chestSeam } = crewSwimsuit
  const swimSeam = sweptDetail(meshes, root, 'Swimsuit chest seam', blank, chestSeam.path, chestSeam.normal)
  meshes.shadows.removeShadowCaster(swimSeam, false)
  return { seat, shorts, shortCuffs, arms, legs, skin, cloth, trim, torso, inset, yoke, trousers, shoes, bareFeet, bareLimbs, swimsuit, swimSeam, shoulders, shirtedSkin, swimArms, swimCalves, swimBareFeet }
}
