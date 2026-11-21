import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopHats, type StockId } from '../wardrobe-stock'
import { garment, sweptDetail } from './crew-shapes'
import { tailored } from './shop-tailoring'

export function buildHat(m: MeshFactory, id: StockId<'hat'>, root: TransformNode, dye?: string) {
  const { color: baseColor, trim, detail } = shopHats[id]
  const color = dye ?? baseColor
  if (id === 'reed-crown') {
    // Two woven rushes wind around an open center. The wearer's hair shows through.
    for (const phase of [0, Math.PI]) {
      const path: Parameters<typeof sweptDetail>[4] = []
      for (let i = 0; i <= 32; i++) {
        const a = i * Math.PI / 16
        path.push([.298 * Math.cos(a), .415 + .009 * Math.sin(6 * a + phase), .248 * Math.sin(a), .011, .009])
      }
      sweptDetail(m, root, 'Woven rush', phase ? detail : color, path, [0, 1, 0], 6)
    }
    for (let i = 0; i < 11; i++) {
      const a = i * 2 * Math.PI / 11, x = Math.cos(a), z = Math.sin(a), h = .076 + .038 * (i % 3)
      sweptDetail(m, root, 'Folded reed blade', i % 3 ? color : trim, [
        [.298 * x, .41, .248 * z, .009, .006], [.303 * x, .442, .255 * z, .020, .009],
        [.303 * x - .018 * z, .419 + h * .75, .261 * z + .018 * x, .016, .007], [.291 * x - .034 * z, .421 + h, .248 * z + .034 * x, .001, .001],
      ], [x, .1, z], 6)
    }
    return
  }
  if (id === 'moon-hat') {
    tailored(m, root, 'Moonpool stitched bucket', color, [
      [.351, 0, .005, .350, .312, detail], [.359, 0, .004, .352, .313, trim], [.364, 0, .004, .347, .308],
      [.401, 0, 0, .296, .257], [.407, 0, 0, .296, .255, detail], [.437, 0, 0, .290, .250, detail],
      [.442, 0, 0, .288, .248], [.535, 0, -.008, .268, .230], [.552, 0, -.006, .250, .214], [.563, 0, 0, .085, .070],
    ], 40)
    sweptDetail(m, root, 'Embroidered crescent', trim, [
      [.071, .513, .235, .001, .002], [.047, .519, .238, .008, .003], [.032, .503, .241, .010, .003],
      [.034, .481, .244, .010, .003], [.052, .473, .243, .006, .003], [.070, .478, .238, .001, .002],
    ], [0, 0, 1])
  } else if (id === 'gull-cap') {
    tailored(m, root, 'Gull skipper cap', color, [
      [.377, 0, .004, .283, .239, detail], [.388, 0, .004, .293, .247, detail], [.420, 0, 0, .295, .247, detail],
      [.424, 0, 0, .300, .248, trim], [.432, 0, 0, .304, .251, trim], [.438, 0, 0, .309, .254],
      [.483, -.009, -.010, .325, .263], [.529, -.015, -.015, .294, .245], [.553, -.017, -.019, .163, .146], [.558, -.016, -.018, .050, .052],
    ], 36)
    const peak = m.sphere(0, .381, .213, .46, .037, .31, detail, root, true, 20)
    peak.rotation.x = .10
    for (const s of [-1, 1]) sweptDetail(m, root, 'Gull wing embroidery', detail, [
      [0, .471, .249, .005, .003], [s * .042, .496, .253, .008, .004], [s * .083, .491, .247, .007, .003], [s * .114, .480, .238, .001, .002],
    ], [0, 0, 1])
  } else if (id === 'jelly-hat') {
    const bell = tailored(m, root, 'Scalloped jellybell bonnet', color, [
      [.355, 0, .004, .309, .261, trim], [.369, 0, .004, .319, .270, trim], [.381, 0, 0, .310, .264, detail],
      [.404, 0, 0, .301, .254], [.475, 0, -.005, .305, .259], [.541, 0, -.012, .253, .222],
      [.580, 0, -.012, .150, .130], [.596, 0, -.009, .045, .042],
    ], 48)
    // Shape the hem and crown into broad scallops with one uninterrupted edge.
    const pos = bell.getVerticesData('position')!
    for (let i = 0; i < pos.length; i += 3) {
      const a = Math.atan2(pos[i + 2] / .26, pos[i] / .31)
      pos[i + 1] += .014 * Math.cos(8 * a) * Math.max(0, 1 - (pos[i + 1] - .355) / .105)
    }
    bell.setVerticesData('position', pos)
    bell.createNormals(false)
    // A sewn bow ties the scalloped brim just behind the left ear.
    for (const side of [-1, 1]) sweptDetail(m, root, 'Bonnet bow', trim, [
      [-.218, .397, -.180, .008, .005], [-.219 + side * .030, .411, -.188 - side * .025, .023, .009],
      [-.220 + side * .048, .413, -.192 - side * .042, .016, .007], [-.218 + side * .027, .392, -.187 - side * .022, .014, .007],
      [-.218, .394, -.180, .006, .004],
    ], [-.65, .1, -.8], 8)
  } else {
    const watchCap = tailored(m, root, 'Buoy watch cap', color, [
      [.375, 0, 0, .283, .238, detail], [.382, 0, 0, .298, .250, detail], [.428, 0, 0, .299, .250, detail],
      [.435, 0, 0, .292, .245, trim], [.445, 0, 0, .289, .242, trim], [.449, 0, 0, .287, .240],
      [.494, 0, -.003, .273, .231], [.546, 0, -.009, .226, .193], [.588, 0, -.015, .129, .115], [.602, 0, -.017, .047, .046],
    ], 36)
    const pigments = watchCap.getVerticesData('color')!
    for (let i = 0; i < 36 * 3; i++) {
      const rib = i % 2 ? .73 : 1.05
      for (let channel = 0; channel < 3; channel++) pigments[4 * i + channel] *= rib
    }
    watchCap.setVerticesData('color', pigments)
    garment(m, root, 'Yarn pom', trim, [[.590, 0, -.019, .035, .036], [.604, 0, -.021, .064, .060],
    [.645, 0, -.024, .072, .069], [.675, 0, -.023, .053, .052], [.686, 0, -.023, .017, .018]], .96, 14)
  }
}
