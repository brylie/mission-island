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
  for (let i = 0;i < positions.length;i += 3) {
    const x = Math.abs(positions[i]), y = positions[i + 1], z = positions[i + 2]
    const cheek = Math.exp(-(((x - .177) / .095) ** 2 + ((y - .178) / .05) ** 2 + ((z - .18) / .12) ** 2))
    const shade = .91 + .09 * Math.min(1, y / .16)
    tones.push(shade, shade * (1 - .18 * cheek), shade * (1 - .23 * cheek), 1)
  }
  face.setVerticesData(VertexBuffer.ColorKind, tones)
  skin.push(face)
  const nose = coastalProfile(meshes, head, 'Nose', base, [
    [-.014, .019, .028, .054], [.012, .017, .034, .057], [.046, -.006, .047, .032], [.064, -.015, .036, .015],
  ], 16)
  nose.position.set(0, .205, .232)
  skin.push(nose)
  const eyes: TransformNode[] = [], brows: Mesh[] = [], earShadows: Mesh[] = []
  for (const s of [-1, 1]) {
    skin.push(meshes.sphere(s * .266, .18, .004, .095, .148, .088, base, head, true, 12))
    earShadows.push(meshes.sphere(s * .281, .182, .039, .043, .074, .018, base, head, false, 9))
    const eye = new TransformNode('Blink at lash line', meshes.scene)
    eye.parent = head
    eye.position.set(s * .109, .256, .223)
    eye.rotation.y = s * .29
    eyes.push(eye)
    meshes.sphere(0, 0, .002, .124, .072, .023, '#efe0bd', eye, false, 12)
    meshes.sphere(-s * .004, -.001, .014, .072, .064, .016, '#594032', eye, false, 11)
    meshes.sphere(-s * .004, 0, .021, .048, .051, .010, '#322927', eye, false, 10)
    meshes.sphere(-.013, .013, .024, .016, .016, .005, '#fff3d8', eye, false, 6)
    sweptDetail(meshes, eye, 'Upper lid', '#543a30', [
      [-.063, -.001, .003, .002, .003], [-.043, .021, .010, .006, .004], [0, .033, .013, .007, .005], [.041, .022, .009, .006, .005], [.065, .002, .004, .002, .003],
    ], [0, 0, 1])
    brows.push(sweptDetail(meshes, head, 'Expressive brow', '#49362e', [
      [s * .047, .319, .231, .008, .006], [s * .083, .330, .228, .015, .009],
      [s * .134, .332, .207, .017, .010], [s * .185, .324, .175, .004, .004],
    ], [0, 0, 1]))
  }
  const mouth = sweptDetail(meshes, head, 'Crooked smile', '#824d3e', [
    [-.097, .118, .212, .002, .003], [-.068, .108, .220, .005, .004],
    [-.018, .103, .232, .005, .004], [.034, .105, .232, .005, .005], [.077, .114, .220, .005, .004], [.101, .128, .213, .002, .003],
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
  return { nose, eyes, brows, mouth, earShadows, hair, cap, brim }
}
