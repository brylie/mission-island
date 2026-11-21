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
      rows = [[0.380, 0, 0, 0.385, 0.332, detail], [0.387, 0, 0, 0.390, 0.336], [0.397, 0, 0, 0.385, 0.331], [0.410, 0, 0, 0.293, 0.250], [0.413, 0, 0, 0.295, 0.251, trim], [0.448, 0, 0, 0.293, 0.250, trim], [0.452, 0, 0, 0.290, 0.248], [0.550, 0, 0, 0.276, 0.232], [0.560, 0, 0, 0.269, 0.227], [0.566, 0, 0, 0.190, 0.160]]
      for (const s of [-1, 1]) sweptDetail(m, root, 'Boater ribbon tails', trim, [
        [0, 0.444, -0.246, 0.020, 0.006],
        [s * 0.035, 0.421, -0.268, 0.026, 0.006],
        [s * 0.077, 0.395, -0.298, 0.021, 0.004],
      ], [0, 0.5, -1], 8)
      break
    case 'bramble-beret':
      rows = [[0.382, 0, 0, 0.279, 0.240, detail], [0.405, 0, 0, 0.293, 0.250, detail], [0.416, 0, 0, 0.296, 0.252], [0.448, -0.030, -0.002, 0.327, 0.269], [0.487, -0.053, -0.009, 0.342, 0.277], [0.546, -0.055, -0.012, 0.292, 0.230], [0.572, -0.073, -0.016, 0.182, 0.144], [0.581, -0.080, -0.018, 0.044, 0.036]]
      sweptDetail(m, root, 'Beret stalk', detail, [[-0.080, 0.576, -0.020, 0.014, 0.014], [-0.088, 0.599, -0.021, 0.014, 0.013], [-0.099, 0.612, -0.020, 0.010, 0.010]], [0, 0, 1], 8)
      break
    case 'dock-flatcap':
      rows = [[0.378, 0, 0, 0.281, 0.240, detail], [0.400, 0, 0, 0.294, 0.248, detail], [0.412, 0, 0.017, 0.297, 0.260], [0.435, 0, 0.033, 0.310, 0.277], [0.457, 0, 0.019, 0.312, 0.277], [0.507, 0, -0.008, 0.279, 0.229], [0.548, 0, -0.024, 0.218, 0.176], [0.567, 0, -0.037, 0.139, 0.109], [0.574, 0, -0.048, 0.061, 0.051]]
      m.sphere(0, 0.391, 0.220, 0.473, 0.037, 0.282, detail, root, true, 24)
      break
    case 'fern-felt':
      rows = [[0.377, 0, 0, 0.355, 0.308, detail], [0.388, 0, 0, 0.367, 0.316], [0.398, 0, 0, 0.352, 0.301], [0.415, 0, 0, 0.299, 0.254], [0.420, 0, 0, 0.296, 0.253, detail], [0.453, 0, 0, 0.289, 0.247, detail], [0.457, 0, 0, 0.288, 0.246], [0.511, 0, -0.008, 0.261, 0.211], [0.572, 0.010, -0.018, 0.208, 0.139], [0.601, 0.017, -0.020, 0.149, 0.070], [0.589, 0.018, -0.020, 0.097, 0.033]]
      sweptDetail(m, root, 'Golden felt feather', trim, [
        [-0.242, 0.431, 0.143, 0.005, 0.003],
        [-0.255, 0.472, 0.148, 0.018, 0.005],
        [-0.267, 0.510, 0.133, 0.021, 0.007],
        [-0.273, 0.553, 0.099, 0.002, 0.002],
      ], [-0.8, 0, 0.6], 8)
      break
    case 'rain-brim':
      rows = [[0.335, 0, -0.032, 0.364, 0.350, detail], [0.341, 0, -0.031, 0.366, 0.352, trim], [0.353, 0, -0.026, 0.358, 0.336], [0.405, 0, -0.006, 0.307, 0.266], [0.420, 0, -0.002, 0.297, 0.256, detail], [0.427, 0, -0.002, 0.294, 0.253], [0.505, 0, -0.010, 0.265, 0.215], [0.551, 0, -0.013, 0.200, 0.161], [0.570, 0, -0.015, 0.103, 0.087], [0.574, 0, -0.014, 0.040, 0.034]]
      // Lift the bill above the brow and let the longer back brim shed rain.
      for (const row of rows.slice(0, 3)) row[0] += 0.022
      break
    default: return false
  }
  const hat = tailored(m, root, name, color, rows, 40)
  if (id === 'rain-brim') {
    const pos = hat.getVerticesData('position')!
    for (let i = 0; i < 3 * 40 * 3; i += 3) pos[i + 1] += pos[i + 2] * 0.15
    hat.setVerticesData('position', pos)
    hat.createNormals(false)
  }
  return true
}
