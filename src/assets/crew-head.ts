import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { garment, sweptDetail } from './crew-shapes'
import { coastalProfile } from './coastal-profiles'
import { createCrewHair } from './crew-hair'

export function createCrewHead(meshes: MeshFactory, root: TransformNode, skin: Mesh[]) {
  // Headwear, face and hair share this fitting space; the existing neck and grip pivots stay in world metres.
  const head = new TransformNode('Head fitting', meshes.scene)
  head.parent = root
  head.position.set(0, 1.315, .006)
  head.scaling.set(.90, .85, .92)
  const base = '#dfac83'
  const face = garment(meshes, head, 'Jaw, cheeks and brow', base, [
    [.012, 0, .052, .085, .104], [.027, 0, .044, .150, .145], [.056, 0, .041, .192, .172],
    [.109, 0, .038, .232, .192], [.172, 0, .029, .261, .210], [.216, 0, .019, .276, .224],
    [.303, 0, .010, .278, .224], [.384, 0, .002, .271, .222], [.452, 0, -.005, .251, .205],
    [.505, 0, -.009, .211, .180], [.543, 0, -.012, .137, .127], [.56, 0, -.011, .027, .035],
  ], .91, 36)
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
  const eyes: { pivot: TransformNode; fill: TransformNode }[] = [], brows: Mesh[] = [], earShadows: Mesh[] = []
  for (const s of [-1, 1]) {
    skin.push(meshes.sphere(s * .266, .18, .004, .095, .148, .088, base, head, true, 12))
    earShadows.push(meshes.sphere(s * .281, .182, .039, .043, .074, .018, base, head, false, 9))
    const eye = new TransformNode('Blink at lash line', meshes.scene)
    eye.parent = head
    eye.position.set(s * .109, .256, .223)
    eye.rotation.y = s * .29
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
    brows.push(sweptDetail(meshes, head, 'Expressive brow', '#49362e', [
      [s * .049, .323 + lift, .231, .007, .006], [s * .083, .332 + lift, .227, .015, .009],
      [s * .130, .332 + lift, .212, .014, .009], [s * .171, .321 + lift, .193, .009, .008],
      [s * .187, .310 + lift, .182, .004, .004],
    ], [0, 0, 1]))
  }
  const smile = sweptDetail(meshes, head, 'Soft smile', '#824d3e', [
    [-.095, .124, .216, .003, .004], [-.073, .111, .225, .006, .005],
    [-.017, .102, .232, .006, .006], [.044, .107, .233, .006, .005],
    [.083, .120, .224, .007, .005], [.098, .137, .219, .004, .004],
  ], [0, 0, 1])
  const grin = sweptDetail(meshes, head, 'Wide smile', '#824d3e', [
    [-.122, .140, .214, .003, .004], [-.088, .119, .228, .008, .006],
    [-.032, .101, .233, .010, .006], [.040, .105, .233, .010, .006],
    [.093, .124, .226, .008, .006], [.121, .150, .214, .004, .004],
  ], [0, 0, 1])
  const hair = createCrewHair(meshes, head)
  const cap = garment(meshes, head, 'Seamed canvas cap', '#658775', [
    [.374, 0, .002, .28, .233], [.389, 0, .003, .29, .245], [.44, 0, -.007, .283, .24],
    [.507, -.010, -.019, .253, .216], [.557, -.017, -.023, .174, .15], [.579, -.021, -.021, .055, .052],
  ], .96)
  const brim = meshes.sphere(0, .378, .202, .477, .035, .316, '#c4b189', head, true, 16)
  brim.rotation.x = .09
  // At face scale the island shadow map aliases lashes and the smile onto the cheeks.
  // Keep direct shape lighting and cast the head's silhouette onto the scene.
  for (const part of head.getChildMeshes()) part.receiveShadows = false
  return { nose, eyes, brows, smile, grin, earShadows, hair, cap, brim }
}
