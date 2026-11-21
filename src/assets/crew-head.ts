import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { garment, sweptDetail } from './crew-shapes'
import { coastalProfile } from './coastal-profiles'
import { headSection, skull } from './crew-scalp'
import { createCrewEar } from './crew-ear'
import { createCrewHair } from './crew-hair'

export function createCrewHead(meshes: MeshFactory, root: TransformNode, skin: Mesh[]) {
  // Headwear, face and hair share this fitting space; the existing neck and grip pivots stay in world metres.
  const head = new TransformNode('Head fitting', meshes.scene)
  head.parent = root
  head.position.set(0, 1.315, 0.006)
  head.scaling.set(0.90, 0.85, 0.92)
  const base = '#dfac83'
  const face = garment(meshes, head, 'Jaw, cheeks and brow', base, skull, 0.91, 36)
  // Drape the lips and brows on the same cheek sections that form the head.
  function facialLine(name: string, color: string, points: [number, number, number, number][]) {
    const line: Parameters<typeof sweptDetail>[4] = points.map(([x, y, width, relief]) => {
      const { center, width: radius, depth } = headSection(y)
      const z = center + depth * (1 - Math.abs(x / radius) ** (2 / 0.91)) ** (0.91 / 2)
      return [x, y, z, width, relief]
    })
    return sweptDetail(meshes, head, name, color, line, [0, 0, 1])
  }
  // Warm the cheeks and ear line gently across the sculpt. Vertex colors follow every selected skin tone.
  const positions = face.getVerticesData(VertexBuffer.PositionKind)!
  const tones: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const x = Math.abs(positions[i]), y = positions[i + 1], z = positions[i + 2]
    const cheek = Math.exp(-(((x - 0.177) / 0.095) ** 2 + ((y - 0.181) / 0.062) ** 2 + ((z - 0.18) / 0.12) ** 2))
    const shade = 0.91 + 0.09 * Math.min(1, y / 0.16)
    tones.push(shade, shade * (1 - 0.13 * cheek), shade * (1 - 0.17 * cheek), 1)
  }
  face.setVerticesData(VertexBuffer.ColorKind, tones)
  skin.push(face)
  const nose = coastalProfile(meshes, head, 'Nose', base, [
    [-0.022, 0.027, 0.031, 0.067],
    [0.010, 0.019, 0.035, 0.059],
    [0.036, -0.004, 0.048, 0.036],
    [0.055, -0.015, 0.044, 0.020],
    [0.064, -0.014, 0.028, 0.012],
  ], 16)
  nose.position.set(0, 0.205, 0.232)
  skin.push(nose)
  const eyes: { pivot: TransformNode, fill: TransformNode }[] = [], brows: Mesh[] = []
  for (const s of [-1, 1]) {
    skin.push(createCrewEar(meshes, head, s, base))
    const eye = new TransformNode('Blink at lash line', meshes.scene)
    eye.parent = head
    eye.position.set(s * 0.109, 0.256, 0.218)
    eye.rotation.y = s * 0.36
    const fill = new TransformNode('Eye under the upper lid', meshes.scene)
    fill.parent = eye
    eyes.push({ pivot: eye, fill })
    meshes.sphere(0, 0, 0.002, 0.110, 0.063, 0.022, '#e9d7b5', fill, false, 12)
    meshes.sphere(-s * 0.003, -0.001, 0.013, 0.076, 0.060, 0.016, '#69452f', fill, false, 12)
    meshes.sphere(-s * 0.003, 0, 0.020, 0.050, 0.049, 0.010, '#322927', fill, false, 10)
    meshes.sphere(-0.010, 0.012, 0.024, 0.012, 0.013, 0.005, '#fff0db', fill, false, 6)
    sweptDetail(meshes, eye, 'Upper lid', '#543a30', [
      [-0.055, -0.003, 0.004, 0.002, 0.003],
      [-0.039, 0.018, 0.010, 0.006, 0.004],
      [0, 0.028, 0.013, 0.008, 0.005],
      [0.041, 0.019, 0.009, 0.006, 0.005],
      [0.057, -0.001, 0.004, 0.002, 0.003],
    ], [0, 0, 1])
    // A slight lift over one eye carries through the neutral expression.
    const lift = s === 1 ? 0.007 : 0
    brows.push(facialLine('Expressive brow', '#49362e', [
      [s * 0.049, 0.323 + lift, 0.007, 0.005],
      [s * 0.083, 0.332 + lift, 0.015, 0.007],
      [s * 0.130, 0.332 + lift, 0.014, 0.007],
      [s * 0.171, 0.321 + lift, 0.009, 0.006],
      [s * 0.187, 0.310 + lift, 0.003, 0.003],
    ]))
  }
  const smile = facialLine('Soft smile', '#824d3e', [
    [-0.095, 0.124, 0.002, 0.002],
    [-0.073, 0.111, 0.005, 0.004],
    [-0.017, 0.102, 0.006, 0.004],
    [0.044, 0.107, 0.005, 0.004],
    [0.083, 0.120, 0.005, 0.004],
    [0.098, 0.137, 0.002, 0.002],
  ])
  const grin = facialLine('Wide smile', '#824d3e', [
    [-0.122, 0.140, 0.002, 0.002],
    [-0.088, 0.119, 0.007, 0.004],
    [-0.032, 0.101, 0.009, 0.005],
    [0.040, 0.105, 0.009, 0.005],
    [0.093, 0.124, 0.007, 0.004],
    [0.121, 0.150, 0.003, 0.002],
  ])
  const hair = createCrewHair(meshes, head)
  const cap = garment(meshes, head, 'Seamed canvas cap', '#658775', [
    [0.374, 0, 0.002, 0.280, 0.233],
    [0.383, 0, 0.003, 0.290, 0.245],
    [0.404, 0, 0.001, 0.292, 0.245],
    [0.414, -0.002, 0, 0.292, 0.244],
    [0.461, -0.006, -0.010, 0.276, 0.233],
    [0.513, -0.012, -0.018, 0.245, 0.210],
    [0.551, -0.016, -0.023, 0.182, 0.160],
    [0.576, -0.020, -0.020, 0.086, 0.081],
    [0.580, -0.020, -0.020, 0.028, 0.025],
  ], 0.96, 48)
  const capTones: number[] = []
  const crown = cap.getVerticesData(VertexBuffer.PositionKind)!
  for (let i = 0; i < crown.length; i += 3) {
    const [x, y, z] = [crown[i], crown[i + 1], crown[i + 2]]
    const meridian = Math.atan2(z + 0.008, x + 0.006)
    const seam = Math.abs(Math.cos(3 * meridian)) ** 28
    const tone = y <= 0.405 ? 0.85 : 1 - 0.12 * seam
    capTones.push(tone, tone, tone, 1)
  }
  cap.setVerticesData(VertexBuffer.ColorKind, capTones)
  // A shallow curve shades the eyes; the bound edge is visible in profile.
  const brim = meshes.sphere(0, 0.379, 0.202, 0.466, 0.034, 0.307, '#c4b189', head, true, 24)
  brim.rotation.x = 0.085
  const strap = sweptDetail(meshes, cap, 'Rear cap strap', '#73614b', [
    [-0.116, 0.400, -0.216, 0.008, 0.004],
    [-0.076, 0.397, -0.237, 0.014, 0.006],
    [0, 0.395, -0.247, 0.015, 0.006],
    [0.071, 0.396, -0.239, 0.014, 0.006],
    [0.104, 0.397, -0.227, 0.009, 0.004],
  ], [0, 0, -1])
  meshes.shadows.removeShadowCaster(strap, false)
  const keeper = garment(meshes, cap, 'Brass strap keeper', '#ab895b', [
    [0.379, 0.047, -0.244, 0.010, 0.006],
    [0.383, 0.047, -0.245, 0.011, 0.007],
    [0.406, 0.047, -0.245, 0.011, 0.007],
    [0.411, 0.047, -0.244, 0.009, 0.005],
  ], 0.7, 12)
  meshes.shadows.removeShadowCaster(keeper, false)
  // At face scale the island shadow map aliases lashes and the smile onto the cheeks.
  // Keep direct shape lighting and cast the head's silhouette onto the scene.
  for (const part of head.getChildMeshes()) part.receiveShadows = false
  return { pivot: head, nose, eyes, brows, smile, grin, hair, cap, brim }
}
