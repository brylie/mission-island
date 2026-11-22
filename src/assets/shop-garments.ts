import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Skeleton } from '@babylonjs/core/Bones/skeleton'
import { bindLegMesh } from './crew-knee'
import { buildHat } from './shop-hats'
import { buildSleeve, buildTopBody } from './shop-tops'
import { buildBottomLeg, buildShoe } from './shop-legwear'
import { waistbandGeometry } from './geometry/shop-tailoring'
import { tailored, type Section } from './shop-tailoring'
import type { MeshFactory } from '../island-meshes'
import { isEveryday, wearsSwimsuit, type CrewAppearance } from '../crew-appearance'
import { isStockPiece, pieceSlots, shopBottoms, shopTops, type PieceSlot, type StockId } from '../wardrobe-stock'

interface GarmentRig {
  root: TransformNode
  head: TransformNode
  knees: Skeleton[]
  arms: TransformNode[]
  legs: TransformNode[]
}

function garmentRoot(name: string, parent: TransformNode) {
  const root = new TransformNode(name, parent.getScene())
  root.parent = parent
  return root
}

function createShopGarment(meshes: MeshFactory, rig: GarmentRig, id: StockId, dye?: string) {
  if (isStockPiece('hat', id)) {
    const anchor = garmentRoot(id, rig.head)
    buildHat(meshes, id, anchor, dye)
    return [anchor]
  }
  if (isStockPiece('shirt', id)) {
    const anchor = garmentRoot(id, rig.root)
    buildTopBody(meshes, id, anchor, dye)
    if (shopTops[id].sleeveless) return [anchor]
    return [anchor, ...rig.arms.map((arm, i) => {
      const sleeve = garmentRoot(id, arm)
      buildSleeve(meshes, id, sleeve, i ? 1 : -1, dye)
      return sleeve
    })]
  }
  const roots = rig.legs.map((leg, i) => {
    const anchor = garmentRoot(id, leg)
    const side = i === 0 ? -1 : 1
    if (isStockPiece('trousers', id)) buildBottomLeg(meshes, id, anchor, side)
    else if (isStockPiece('shoes', id)) buildShoe(meshes, id, anchor, side)
    for (const mesh of anchor.getChildMeshes()) if (mesh instanceof Mesh) bindLegMesh(mesh, rig.knees[i])
    return anchor
  })
  if (isStockPiece('trousers', id)) {
    const belt = garmentRoot(id, rig.root)
    const { color, detail } = shopBottoms[id]
    const { rows, sides, opening } = waistbandGeometry
    const profile = rows.map(([y, x, z, w, d, trim]): Section => [y, x, z, w, d, trim ? detail : undefined])
    tailored(meshes, belt, 'Waistband and seat', color, profile, sides, opening)
    roots.push(belt)
  }
  return roots
}

const farmWorkwear = { shirt: 'dock-jacket', trousers: 'crab-cargo', shoes: 'puddle-wellies', hat: 'rain-brim' } as const

export function wornStock<Slot extends PieceSlot>(slot: Slot, appearance: CrewAppearance) {
  if (appearance.uniform !== 'farmer' && (!isEveryday(appearance.uniform) || (slot === 'trousers' && wearsSwimsuit(appearance)))) return
  const id = appearance.uniform === 'farmer' ? farmWorkwear[slot] : appearance[slot]
  return isStockPiece(slot, id) ? id : undefined
}

export function createShopAttachments(meshes: MeshFactory, rig: GarmentRig) {
  const worn = new Map<PieceSlot, { id: StockId, roots: TransformNode[], dye?: string }>()
  function sync(appearance: CrewAppearance, dye?: string) {
    for (const slot of pieceSlots) {
      const id = wornStock(slot, appearance)
      const before = worn.get(slot)
      const fabricDye = id && (slot === 'shirt' || slot === 'hat') ? dye : undefined
      if (id === before?.id && fabricDye === before?.dye) continue
      for (const root of before?.roots ?? []) {
        for (const mesh of root.getChildMeshes()) meshes.shadows.removeShadowCaster(mesh, false)
        root.dispose()
      }
      worn.delete(slot)
      if (id) worn.set(slot, { id, dye: fabricDye, roots: createShopGarment(meshes, rig, id, fabricDye) })
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
