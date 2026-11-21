import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopHats, type StockId } from '../wardrobe-stock'
import { sweptDetail } from './crew-shapes'
import { tailored, type Section } from './shop-tailoring'

// Crown profiles run from the outside of the brim up to the tip. Off-center rows
// give the soft beret and the flat cap their lean without tilting the hairline.
export function fitMarketHat(m: MeshFactory, root: TransformNode, id: StockId<'hat'>, color: string) {
  const { name, trim, detail } = shopHats[id]
  let rows: Section[]
  switch (id) {
    case 'picnic-boater':
      rows = [[.380, 0, 0, .385, .332, detail], [.387, 0, 0, .390, .336], [.397, 0, 0, .385, .331],
      [.410, 0, 0, .293, .250], [.413, 0, 0, .295, .251, trim], [.448, 0, 0, .293, .250, trim],
      [.452, 0, 0, .290, .248], [.550, 0, 0, .276, .232], [.560, 0, 0, .269, .227], [.566, 0, 0, .190, .160]]
      for (const s of [-1, 1]) sweptDetail(m, root, 'Boater ribbon tails', trim, [
        [0, .444, -.246, .020, .006], [s * .035, .421, -.268, .026, .006],
        [s * .077, .395, -.298, .021, .004]], [0, .5, -1], 8)
      break
    case 'bramble-beret':
      rows = [[.382, 0, 0, .279, .240, detail], [.405, 0, 0, .293, .250, detail], [.416, 0, 0, .296, .252],
      [.448, -.030, -.002, .327, .269], [.487, -.053, -.009, .342, .277], [.546, -.055, -.012, .292, .230],
      [.572, -.073, -.016, .182, .144], [.581, -.080, -.018, .044, .036]]
      sweptDetail(m, root, 'Beret stalk', detail, [[-.080, .576, -.020, .014, .014],
      [-.088, .599, -.021, .014, .013], [-.099, .612, -.020, .010, .010]], [0, 0, 1], 8)
      break
    case 'dock-flatcap':
      rows = [[.378, 0, 0, .281, .240, detail], [.400, 0, 0, .294, .248, detail],
      [.412, 0, .017, .297, .260], [.435, 0, .033, .310, .277], [.457, 0, .019, .312, .277],
      [.507, 0, -.008, .279, .229], [.548, 0, -.024, .218, .176], [.567, 0, -.037, .139, .109], [.574, 0, -.048, .061, .051]]
      m.sphere(0, .391, .220, .473, .037, .282, detail, root, true, 24)
      break
    case 'fern-felt':
      rows = [[.377, 0, 0, .355, .308, detail], [.388, 0, 0, .367, .316], [.398, 0, 0, .352, .301],
      [.415, 0, 0, .299, .254], [.420, 0, 0, .296, .253, detail], [.453, 0, 0, .289, .247, detail],
      [.457, 0, 0, .288, .246], [.511, 0, -.008, .261, .211], [.572, .010, -.018, .208, .139],
      [.601, .017, -.020, .149, .070], [.589, .018, -.020, .097, .033]]
      sweptDetail(m, root, 'Golden felt feather', trim, [
        [-.242, .431, .143, .005, .003], [-.255, .472, .148, .018, .005],
        [-.267, .510, .133, .021, .007], [-.273, .553, .099, .002, .002]], [-.8, 0, .6], 8)
      break
    case 'rain-brim':
      rows = [[.335, 0, -.032, .364, .350, detail], [.341, 0, -.031, .366, .352, trim],
      [.353, 0, -.026, .358, .336], [.405, 0, -.006, .307, .266], [.420, 0, -.002, .297, .256, detail],
      [.427, 0, -.002, .294, .253], [.505, 0, -.010, .265, .215],
      [.551, 0, -.013, .200, .161], [.570, 0, -.015, .103, .087], [.574, 0, -.014, .040, .034]]
      // Lift the bill above the brow and let the longer back brim shed rain.
      for (const row of rows.slice(0, 3)) row[0] += .022
      break
    default: return false
  }
  const hat = tailored(m, root, name, color, rows, 40)
  if (id === 'rain-brim') {
    const pos = hat.getVerticesData('position')!
    for (let i = 0; i < 3 * 40 * 3; i += 3) pos[i + 1] += pos[i + 2] * .15
    hat.setVerticesData('position', pos)
    hat.createNormals(false)
  }
  return true
}
