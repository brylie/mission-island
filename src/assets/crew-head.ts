import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { garment, sweptDetail } from './crew-shapes'
import { coastalProfile } from './coastal-profiles'
import { createCrewEar } from './crew-ear'
import { createCrewHair } from './crew-hair'

export function createCrewHead(meshes: MeshFactory, root: TransformNode, skin: Mesh[]) {
  // Headwear, face and hair share this fitting space; the existing neck and grip pivots stay in world metres.
  const head = new TransformNode('Head fitting', meshes.scene)
  head.parent = root
  head.position.set(0, 1.315, .006)
  head.scaling.set(.90, .85, .92)
  const base = '#dfac83'
  const skull: Parameters<typeof garment>[4] = [
    [.012, 0, .052, .085, .104], [.027, 0, .044, .150, .145], [.056, 0, .041, .192, .172],
    [.109, 0, .038, .232, .192], [.172, 0, .029, .261, .210], [.216, 0, .019, .276, .224],
    [.303, 0, .010, .278, .224], [.384, 0, .002, .271, .222], [.452, 0, -.005, .251, .205],
    [.505, 0, -.009, .211, .180], [.543, 0, -.012, .137, .127], [.56, 0, -.011, .027, .035],
  ]
  const face = garment(meshes, head, 'Jaw, cheeks and brow', base, skull, .91, 36)
  // Drape the lips and brows on the same cheek sections that form the head.
  function facialLine(name: string, color: string, points: [number, number, number, number][]) {
    const line: Parameters<typeof sweptDetail>[4] = points.map(([x, y, width, relief]) => {
      const row = skull.findIndex(section => section[0] >= y)
      const lo = skull[row - 1], hi = skull[row]
      const t = (y - lo[0]) / (hi[0] - lo[0])
      const radius = lo[3] + (hi[3] - lo[3]) * t
      const depth = lo[4] + (hi[4] - lo[4]) * t
      const z = lo[2] + (hi[2] - lo[2]) * t + depth * (1 - Math.abs(x / radius) ** (2 / .91)) ** (.91 / 2)
      return [x, y, z, width, relief]
    })
    return sweptDetail(meshes, head, name, color, line, [0, 0, 1])
  }
  // Warm the cheeks and ear line gently across the sculpt. Vertex colors follow every selected skin tone.
  const positions = face.getVerticesData(VertexBuffer.PositionKind)!
  const tones: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const x = Math.abs(positions[i]), y = positions[i + 1], z = positions[i + 2]
    const cheek = Math.exp(-(((x - .177) / .095) ** 2 + ((y - .181) / .062) ** 2 + ((z - .18) / .12) ** 2))
    const shade = .91 + .09 * Math.min(1, y / .16)
    tones.push(shade, shade * (1 - .13 * cheek), shade * (1 - .17 * cheek), 1)
  }
  face.setVerticesData(VertexBuffer.ColorKind, tones)
  skin.push(face)
  const nose = coastalProfile(meshes, head, 'Nose', base, [
    [-.022, .027, .031, .067], [.010, .019, .035, .059], [.036, -.004, .048, .036],
    [.055, -.015, .044, .020], [.064, -.014, .028, .012],
  ], 16)
  nose.position.set(0, .205, .232)
  skin.push(nose)
  const eyes: { pivot: TransformNode; fill: TransformNode }[] = [], brows: Mesh[] = []
  for (const s of [-1, 1]) {
    skin.push(createCrewEar(meshes, head, s, base))
    const eye = new TransformNode('Blink at lash line', meshes.scene)
    eye.parent = head
    eye.position.set(s * .109, .256, .218)
    eye.rotation.y = s * .36
    const fill = new TransformNode('Eye under the upper lid', meshes.scene)
    fill.parent = eye
    eyes.push({ pivot: eye, fill })
    meshes.sphere(0, 0, .002, .110, .063, .022, '#e9d7b5', fill, false, 12)
    meshes.sphere(-s * .003, -.001, .013, .076, .060, .016, '#69452f', fill, false, 12)
    meshes.sphere(-s * .003, 0, .020, .050, .049, .010, '#322927', fill, false, 10)
    meshes.sphere(-.010, .012, .024, .012, .013, .005, '#fff0db', fill, false, 6)
    sweptDetail(meshes, eye, 'Upper lid', '#543a30', [
      [-.055, -.003, .004, .002, .003], [-.039, .018, .010, .006, .004], [0, .028, .013, .008, .005],
      [.041, .019, .009, .006, .005], [.057, -.001, .004, .002, .003],
    ], [0, 0, 1])
    // A slight lift over one eye carries through the neutral expression.
    const lift = s === 1 ? .007 : 0
    brows.push(facialLine('Expressive brow', '#49362e', [
      [s * .049, .323 + lift, .007, .005], [s * .083, .332 + lift, .015, .007],
      [s * .130, .332 + lift, .014, .007], [s * .171, .321 + lift, .009, .006],
      [s * .187, .310 + lift, .003, .003],
    ]))
  }
  const smile = facialLine('Soft smile', '#824d3e', [
    [-.095, .124, .002, .002], [-.073, .111, .005, .004], [-.017, .102, .006, .004],
    [.044, .107, .005, .004], [.083, .120, .005, .004], [.098, .137, .002, .002],
  ])
  const grin = facialLine('Wide smile', '#824d3e', [
    [-.122, .140, .002, .002], [-.088, .119, .007, .004], [-.032, .101, .009, .005],
    [.040, .105, .009, .005], [.093, .124, .007, .004], [.121, .150, .003, .002],
  ])
  const hair = createCrewHair(meshes, head)
  const cap = garment(meshes, head, 'Seamed canvas cap', '#658775', [
    [.374, 0, .002, .280, .233], [.383, 0, .003, .290, .245], [.404, 0, .001, .292, .245],
    [.414, -.002, 0, .292, .244], [.461, -.006, -.010, .276, .233],
    [.513, -.012, -.018, .245, .210], [.551, -.016, -.023, .182, .160],
    [.576, -.020, -.020, .086, .081], [.580, -.020, -.020, .028, .025],
  ], .96, 48)
  const capTones: number[] = []
  const crown = cap.getVerticesData(VertexBuffer.PositionKind)!
  for (let i = 0; i < crown.length; i += 3) {
    const [x, y, z] = [crown[i], crown[i + 1], crown[i + 2]]
    const meridian = Math.atan2(z + .008, x + .006)
    const seam = Math.abs(Math.cos(3 * meridian)) ** 28
    const tone = y <= .405 ? .85 : 1 - .12 * seam
    capTones.push(tone, tone, tone, 1)
  }
  cap.setVerticesData(VertexBuffer.ColorKind, capTones)
  // A shallow curve shades the eyes; the bound edge is visible in profile.
  const brim = meshes.sphere(0, .379, .202, .466, .034, .307, '#c4b189', head, true, 24)
  brim.rotation.x = .085
  const strap = sweptDetail(meshes, cap, 'Rear cap strap', '#73614b', [
    [-.116, .400, -.216, .008, .004], [-.076, .397, -.237, .014, .006],
    [0, .395, -.247, .015, .006], [.071, .396, -.239, .014, .006], [.104, .397, -.227, .009, .004],
  ], [0, 0, -1])
  meshes.shadows.removeShadowCaster(strap, false)
  const keeper = garment(meshes, cap, 'Brass strap keeper', '#ab895b', [
    [.379, .047, -.244, .010, .006], [.383, .047, -.245, .011, .007],
    [.406, .047, -.245, .011, .007], [.411, .047, -.244, .009, .005],
  ], .7, 12)
  meshes.shadows.removeShadowCaster(keeper, false)
  // At face scale the island shadow map aliases lashes and the smile onto the cheeks.
  // Keep direct shape lighting and cast the head's silhouette onto the scene.
  for (const part of head.getChildMeshes()) part.receiveShadows = false
  return { pivot: head, nose, eyes, brows, smile, grin, hair, cap, brim }
}
