import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { isEveryday, wearsSwimsuit, type CrewAppearance } from '../crew-appearance'
import { isStockPiece, pieceSlots, shopBottoms, shopHats, shopShoes, shopTops, type PieceSlot, type StockId } from '../wardrobe-stock'

interface GarmentRig {
  root: TransformNode
  arms: TransformNode[]
  legs: TransformNode[]
}

function garmentRoot(name: string, parent: TransformNode) {
  const root = new TransformNode(name, parent.getScene())
  root.parent = parent
  return root
}

function buildHat({ sphere, box, cylinder }: MeshFactory, id: StockId<'hat'>, root: TransformNode) {
  const { color, trim, detail } = shopHats[id]
  switch (id) {
    case 'gull-cap':
      sphere(0, 1.72, .017, .64, .32, .61, color, root)
      sphere(0, 1.63, .075, .64, .092, .64, detail, root)
      sphere(0, 1.634, .272, .48, .072, .43, trim, root)
      for (const side of [-1, 1]) {
        const plume = sphere(side * .21, 1.799, -.108, .19, .33, .095, color, root)
        plume.rotation.z = -side * .65
        sphere(side * .186, 1.746, -.257, .143, .134, .072, detail, root)
      }
      break
    case 'moon-hat':
      cylinder(0, 1.764, .018, .48, .59, .22, 18, color, root)
      cylinder(0, 1.645, .018, .58, .82, .085, 22, color, root)
      cylinder(0, 1.697, .018, .554, .58, .052, 22, detail, root)
      for (const sign of [-1, 1]) {
        sphere(-.052, 1.78, .018 + sign * .258, .138, .136, .055, trim, root)
        sphere(-.021, 1.806, .018 + sign * .269, .11, .114, .064, color, root)
        sphere(.086, 1.796, .018 + sign * .25, .042, .045, .04, trim, root)
      }
      break
    case 'jelly-hat':
      sphere(0, 1.756, .012, .69, .39, .67, color, root)
      sphere(0, 1.657, .014, .72, .109, .69, detail, root)
      for (let bead = 0; bead < 10; bead++) {
        const angle = bead * Math.PI / 5
        sphere(Math.cos(angle) * .312, 1.632, .014 + Math.sin(angle) * .305, .119, .105, .118, trim, root)
      }
      sphere(0, 1.883, -.043, .26, .095, .21, trim, root)
      break
    case 'reed-crown':
      sphere(0, 1.70, .012, .61, .20, .587, detail, root)
      sphere(0, 1.65, .012, .633, .104, .6, trim, root)
      for (let reed = 0; reed < 9; reed++) {
        const angle = reed * 2 * Math.PI / 9
        const height = reed % 2 === 0 ? .27 : .19
        const leaf = box(Math.cos(angle) * .258, 1.755, Math.sin(angle) * .255 + .012, .078, height, .062, color, root)
        leaf.rotation.set(Math.sin(angle) * .24, angle, -Math.cos(angle) * .22)
        sphere(leaf.position.x, 1.75 + height * .46, leaf.position.z, .075, .083, .075, trim, root)
      }
      break
    case 'buoy-hat':
      sphere(0, 1.751, .007, .605, .374, .591, color, root)
      cylinder(0, 1.645, .016, .60, .61, .098, 20, detail, root)
      sphere(0, 1.941, -.016, .20, .219, .20, trim, root)
      for (const sign of [-1, 1]) {
        sphere(0, 1.775, .016 + sign * .257, .22, .091, .111, trim, root)
      }
  }
}

function buildTopBody({ sphere, box }: MeshFactory, id: StockId<'shirt'>, root: TransformNode) {
  const { color, trim, detail } = shopTops[id]
  const width = id === 'squid-coat' ? .89 : .83
  sphere(0, .98, 0, width, .79, .60, color, root, true, 18)
  sphere(0, 1.248, .004, .42, .095, .439, detail, root)
  switch (id) {
    case 'squid-coat':
      sphere(0, .727, -.05, .76, .36, .59, detail, root)
      for (const side of [-1, 1]) {
        sphere(side * .191, 1.212, -.15, .30, .144, .27, trim, root)
        for (const y of [.92, 1.05, 1.16]) sphere(side * .091, y, .283 - (y - .96) ** 2, .064, .064, .048, trim, root)
        const flap = sphere(side * .139, .76, -.27, .26, .19, .1, color, root)
        flap.rotation.z = -side * .16
      }
      break
    case 'star-knit':
      for (const [x, y, z] of [[-.217, 1.128, -.227], [-.112, 1.051, -.296], [.028, 1.14, -.275],
        [.148, .98, -.283], [.239, .89, -.239], [0, .84, -.285], [.10, 1.09, .284]]) {
        sphere(x, y, z, .071, .072, .055, trim, root)
      }
      sphere(0, .742, 0, .669, .117, .49, detail, root)
      break
    case 'kelp-vest':
      for (const side of [-1, 1]) {
        const fin = sphere(side * .237, 1.049, -.217, .22, .475, .14, trim, root)
        fin.rotation.z = -side * .43
        const front = sphere(side * .204, .964, .241, .234, .342, .13, detail, root)
        front.rotation.z = -side * .16
      }
      box(0, .961, .299, .045, .40, .034, trim, root)
      break
    case 'beacon-top':
      for (const y of [.929, 1.068]) {
        sphere(0, y, 0, .836, .118, .608, trim, root, true, 22)
      }
      sphere(0, .718, 0, .645, .116, .52, detail, root)
      break
    case 'fox-knit': {
      const tail = sphere(.083, .986, -.274, .25, .426, .10, detail, root)
      tail.rotation.z = -.57
      const tip = sphere(.187, 1.133, -.255, .181, .16, .085, trim, root)
      tip.rotation.z = -.52
      sphere(-.138, 1.107, .263, .185, .192, .11, trim, root)
      break
    }
  }
}

function buildTop(meshes: MeshFactory, id: StockId<'shirt'>, root: TransformNode, arms: TransformNode[]) {
  const { sphere } = meshes
  const { color, trim, detail, sleeveless } = shopTops[id]
  buildTopBody(meshes, id, root)
  if (sleeveless) return []
  return arms.map((arm, i) => {
    const sleeve = garmentRoot(id, arm)
    const side = i === 0 ? -1 : 1
    const size = id === 'squid-coat' ? 1.11 : 1
    const fabric = sphere(side * .075, -.218, 0, .265 * size, .575, .279 * size, color, sleeve, true, 14)
    fabric.rotation.z = side * .18
    if (id === 'beacon-top') {
      const band = sphere(side * .103, -.31, .005, .257, .14, .27, trim, sleeve)
      band.rotation.z = side * .18
    }
    sphere(side * .111, -.442, 0, .225, .115, .243, id === 'fox-knit' ? trim : detail, sleeve)
    return sleeve
  })
}

function buildBottomLeg({ sphere, box }: MeshFactory, id: StockId<'trousers'>, leg: TransformNode, side: number) {
  const { color, trim, detail, short } = shopBottoms[id]
  const hem = short ? -.256 : -.496
  const width = id === 'tide-cuffs' || id === 'cloud-pants' ? .341 : .31
  sphere(0, short ? -.104 : -.244, 0, width, short ? .40 : .633, .325, color, leg, true, 16)
  sphere(0, hem, 0, short ? width * .81 : .255, .115, .251, trim, leg)
  switch (id) {
    case 'crab-cargo':
      box(side * .123, -.24, -.017, .103, .221, .205, detail, leg)
      box(side * .15, -.154, -.016, .073, .067, .213, trim, leg)
      break
    case 'cloud-pants':
      for (const y of [-.12, -.252, -.381]) sphere(0, y, -.008, width * .97, .188, .349, color, leg, true, 14)
      sphere(side * .081, -.32, -.117, .123, .123, .092, detail, leg)
      break
    case 'tide-cuffs':
      sphere(0, -.236, 0, .327, .129, .309, trim, leg)
      sphere(side * .07, -.117, -.142, .094, .13, .052, detail, leg)
      break
    case 'salt-shorts':
      for (const sign of [-1, 1]) {
        sphere(sign * .074, -.248, -.093, .09, .104, .09, trim, leg)
      }
      break
    case 'sail-pants': {
      const patch = box(side * .048, -.321, .137, .177, .196, .053, detail, leg)
      patch.rotation.z = side * .14
      sphere(-side * .089, -.19, -.132, .128, .14, .088, trim, leg)
      break
    }
  }
}

function buildShoe({ sphere, box, cylinder }: MeshFactory, id: StockId<'shoes'>, leg: TransformNode, side: number) {
  const { color, trim, detail, open } = shopShoes[id]
  sphere(0, -.602, .133, open ? .294 : .376, .14, open ? .444 : .569, detail, leg, true, 14)
  if (!open) sphere(0, -.529, .131, .36, .234, .54, color, leg, true, 14)
  switch (id) {
    case 'kelp-boots':
      cylinder(0, -.40, .007, .292, .29, .275, 16, color, leg)
      sphere(0, -.292, .007, .333, .092, .331, trim, leg)
      sphere(side * .088, -.397, -.12, .11, .226, .102, detail, leg).rotation.z = side * .31
      break
    case 'crab-clogs':
      for (const claw of [-1, 1]) {
        sphere(claw * .086, -.526, .367, .161, .134, .198, trim, leg).rotation.y = claw * .37
      }
      sphere(0, -.459, .064, .305, .078, .261, detail, leg)
      break
    case 'moth-shoes':
      for (const wing of [-1, 1]) {
        sphere(wing * .103, -.454, .234, .21, .092, .237, trim, leg).rotation.y = wing * .47
      }
      sphere(0, -.429, .23, .074, .13, .217, detail, leg)
      break
    case 'shell-shoes':
      sphere(0, -.539, .225, .298, .130, .113, color, leg)
      sphere(0, -.492, .24, .14, .133, .107, trim, leg)
      sphere(0, -.531, .012, .279, .143, .10, color, leg)
      break
    case 'light-tops':
      sphere(0, -.435, .02, .318, .34, .335, color, leg)
      for (const z of [.142, .207, .273]) sphere(0, -.421 - (z - .142) * .22, z, .183, .05, .044, trim, leg)
      box(side * .163, -.484, .095, .052, .061, .22, detail, leg)
  }
}

function createShopGarment(meshes: MeshFactory, rig: GarmentRig, id: StockId) {
  if (isStockPiece('hat', id)) {
    const anchor = garmentRoot(id, rig.root)
    buildHat(meshes, id, anchor)
    return [anchor]
  }
  if (isStockPiece('shirt', id)) {
    const anchor = garmentRoot(id, rig.root)
    return [anchor, ...buildTop(meshes, id, anchor, rig.arms)]
  }
  const roots = rig.legs.map((leg, i) => {
    const anchor = garmentRoot(id, leg)
    const side = i === 0 ? -1 : 1
    if (isStockPiece('trousers', id)) buildBottomLeg(meshes, id, anchor, side)
    else if (isStockPiece('shoes', id)) buildShoe(meshes, id, anchor, side)
    return anchor
  })
  if (isStockPiece('trousers', id)) {
    const belt = garmentRoot(id, rig.root)
    meshes.sphere(0, .698, .017, .64, .211, .379, shopBottoms[id].color, belt)
    meshes.sphere(0, .744, .005, .605, .076, .368, shopBottoms[id].detail, belt)
    roots.push(belt)
  }
  return roots
}

export function wornStock<Slot extends PieceSlot>(slot: Slot, appearance: CrewAppearance) {
  if (!isEveryday(appearance.uniform) || (slot === 'trousers' && wearsSwimsuit(appearance))) return
  const id = appearance[slot]
  return isStockPiece(slot, id) ? id : undefined
}

export function createShopAttachments(meshes: MeshFactory, rig: GarmentRig) {
  const worn = new Map<PieceSlot, { id: StockId; roots: TransformNode[] }>()
  function sync(appearance: CrewAppearance) {
    for (const slot of pieceSlots) {
      const id = wornStock(slot, appearance)
      const before = worn.get(slot)
      if (id === before?.id) continue
      for (const root of before?.roots ?? []) {
        for (const mesh of root.getChildMeshes()) meshes.shadows.removeShadowCaster(mesh, false)
        root.dispose()
      }
      worn.delete(slot)
      if (id) worn.set(slot, { id, roots: createShopGarment(meshes, rig, id) })
    }
  }
  return {
    sync,
    setHatVisible(visible: boolean) {
      const hat = worn.get('hat')
      for (const root of hat?.roots ?? []) root.setEnabled(visible)
      return Boolean(hat)
    },
  }
}
