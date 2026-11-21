import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopHats, type StockId } from '../wardrobe-stock'
import { garment, sweptDetail } from './crew-shapes'
import { fitMarketHat } from './shop-millinery'
import { tailored } from './shop-tailoring'

export function buildHat(m: MeshFactory, id: StockId<'hat'>, root: TransformNode, dye?: string) {
  const { color: baseColor, trim, detail } = shopHats[id]
  const color = dye ?? baseColor
  if (fitMarketHat(m, root, id, color)) return
  if (id === 'reed-crown') {
    // Two woven rushes wind around an open center. The wearer's hair shows through.
    for (const phase of [0, Math.PI]) {
      const path: Parameters<typeof sweptDetail>[4] = []
      for (let i = 0; i <= 32; i++) {
        const a = i * Math.PI / 16
        path.push([0.298 * Math.cos(a), 0.415 + 0.009 * Math.sin(6 * a + phase), 0.248 * Math.sin(a), 0.011, 0.009])
      }
      sweptDetail(m, root, 'Woven rush', phase ? detail : color, path, [0, 1, 0], 6)
    }
    for (let i = 0; i < 11; i++) {
      const a = i * 2 * Math.PI / 11, x = Math.cos(a), z = Math.sin(a), h = 0.076 + 0.038 * (i % 3)
      sweptDetail(m, root, 'Folded reed blade', i % 3 ? color : trim, [
        [0.298 * x, 0.41, 0.248 * z, 0.009, 0.006],
        [0.303 * x, 0.442, 0.255 * z, 0.020, 0.009],
        [0.303 * x - 0.018 * z, 0.419 + h * 0.75, 0.261 * z + 0.018 * x, 0.016, 0.007],
        [0.291 * x - 0.034 * z, 0.421 + h, 0.248 * z + 0.034 * x, 0.001, 0.001],
      ], [x, 0.1, z], 6)
    }
    return
  }
  if (id === 'moon-hat') {
    tailored(m, root, 'Moonpool stitched bucket', color, [
      [0.351, 0, 0.005, 0.350, 0.312, detail],
      [0.359, 0, 0.004, 0.352, 0.313, trim],
      [0.364, 0, 0.004, 0.347, 0.308],
      [0.401, 0, 0, 0.296, 0.257],
      [0.407, 0, 0, 0.296, 0.255, detail],
      [0.437, 0, 0, 0.290, 0.250, detail],
      [0.442, 0, 0, 0.288, 0.248],
      [0.535, 0, -0.008, 0.268, 0.230],
      [0.552, 0, -0.006, 0.250, 0.214],
      [0.563, 0, 0, 0.085, 0.070],
    ], 40)
    sweptDetail(m, root, 'Embroidered crescent', trim, [
      [0.071, 0.513, 0.235, 0.001, 0.002],
      [0.047, 0.519, 0.238, 0.008, 0.003],
      [0.032, 0.503, 0.241, 0.010, 0.003],
      [0.034, 0.481, 0.244, 0.010, 0.003],
      [0.052, 0.473, 0.243, 0.006, 0.003],
      [0.070, 0.478, 0.238, 0.001, 0.002],
    ], [0, 0, 1])
  }
  else if (id === 'gull-cap') {
    tailored(m, root, 'Gull skipper cap', color, [
      [0.377, 0, 0.004, 0.283, 0.239, detail],
      [0.388, 0, 0.004, 0.293, 0.247, detail],
      [0.420, 0, 0, 0.295, 0.247, detail],
      [0.424, 0, 0, 0.300, 0.248, trim],
      [0.432, 0, 0, 0.304, 0.251, trim],
      [0.438, 0, 0, 0.309, 0.254],
      [0.483, -0.009, -0.010, 0.325, 0.263],
      [0.529, -0.015, -0.015, 0.294, 0.245],
      [0.553, -0.017, -0.019, 0.163, 0.146],
      [0.558, -0.016, -0.018, 0.050, 0.052],
    ], 36)
    const peak = m.sphere(0, 0.381, 0.213, 0.46, 0.037, 0.31, detail, root, true, 20)
    peak.rotation.x = 0.10
    for (const s of [-1, 1]) sweptDetail(m, root, 'Gull wing embroidery', detail, [
      [0, 0.471, 0.249, 0.005, 0.003],
      [s * 0.042, 0.496, 0.253, 0.008, 0.004],
      [s * 0.083, 0.491, 0.247, 0.007, 0.003],
      [s * 0.114, 0.480, 0.238, 0.001, 0.002],
    ], [0, 0, 1])
  }
  else if (id === 'jelly-hat') {
    const bell = tailored(m, root, 'Scalloped jellybell bonnet', color, [
      [0.355, 0, 0.004, 0.309, 0.261, trim],
      [0.369, 0, 0.004, 0.319, 0.270, trim],
      [0.381, 0, 0, 0.310, 0.264, detail],
      [0.404, 0, 0, 0.301, 0.254],
      [0.475, 0, -0.005, 0.305, 0.259],
      [0.541, 0, -0.012, 0.253, 0.222],
      [0.580, 0, -0.012, 0.150, 0.130],
      [0.596, 0, -0.009, 0.045, 0.042],
    ], 48)
    // Shape the hem and crown into broad scallops with one uninterrupted edge.
    const pos = bell.getVerticesData('position')!
    for (let i = 0; i < pos.length; i += 3) {
      const a = Math.atan2(pos[i + 2] / 0.26, pos[i] / 0.31)
      pos[i + 1] += 0.014 * Math.cos(8 * a) * Math.max(0, 1 - (pos[i + 1] - 0.355) / 0.105)
    }
    bell.setVerticesData('position', pos)
    bell.createNormals(false)
    // A sewn bow ties the scalloped brim just behind the left ear.
    for (const side of [-1, 1]) sweptDetail(m, root, 'Bonnet bow', trim, [
      [-0.218, 0.397, -0.180, 0.008, 0.005],
      [-0.219 + side * 0.030, 0.411, -0.188 - side * 0.025, 0.023, 0.009],
      [-0.220 + side * 0.048, 0.413, -0.192 - side * 0.042, 0.016, 0.007],
      [-0.218 + side * 0.027, 0.392, -0.187 - side * 0.022, 0.014, 0.007],
      [-0.218, 0.394, -0.180, 0.006, 0.004],
    ], [-0.65, 0.1, -0.8], 8)
  }
  else {
    const watchCap = tailored(m, root, 'Buoy watch cap', color, [
      [0.375, 0, 0, 0.283, 0.238, detail],
      [0.382, 0, 0, 0.298, 0.250, detail],
      [0.428, 0, 0, 0.299, 0.250, detail],
      [0.435, 0, 0, 0.292, 0.245, trim],
      [0.445, 0, 0, 0.289, 0.242, trim],
      [0.449, 0, 0, 0.287, 0.240],
      [0.494, 0, -0.003, 0.273, 0.231],
      [0.546, 0, -0.009, 0.226, 0.193],
      [0.588, 0, -0.015, 0.129, 0.115],
      [0.602, 0, -0.017, 0.047, 0.046],
    ], 36)
    const pigments = watchCap.getVerticesData('color')!
    for (let i = 0; i < 36 * 3; i++) {
      const rib = i % 2 ? 0.73 : 1.05
      for (let channel = 0; channel < 3; channel++) pigments[4 * i + channel] *= rib
    }
    watchCap.setVerticesData('color', pigments)
    garment(m, root, 'Yarn pom', trim, [[0.590, 0, -0.019, 0.035, 0.036], [0.604, 0, -0.021, 0.064, 0.060], [0.645, 0, -0.024, 0.072, 0.069], [0.675, 0, -0.023, 0.053, 0.052], [0.686, 0, -0.023, 0.017, 0.018]], 0.96, 14)
  }
}
