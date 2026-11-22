import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { MeshFactory } from '../island-meshes'
import { garment, sweptDetail } from './crew-shapes'
import { coastalProfile } from './coastal-profiles'
import { headSection, skull } from './crew-scalp'
import { createCrewEar } from './crew-ear'
import { createCrewHair } from './crew-hair'
import { crewCanvasCap, crewFace, crewHeadFit, type FaceLinePoint } from './geometry/crew-face'

const positionComponents = 3
const ellipsePower = 2
const squaredDistance = 2

export function createCrewHead(meshes: MeshFactory, root: TransformNode, skin: Mesh[]) {
  // Headwear, face and hair share this fitting space; the existing neck and grip pivots stay in world metres.
  const head = new TransformNode('Head fitting', meshes.scene)
  head.parent = root
  head.position.set(...crewHeadFit.position)
  head.scaling.set(...crewHeadFit.scale)
  const { base, skull: { softness, sides }, complexion, nose: noseShape, eye: eyeShape, features } = crewFace
  const face = garment(meshes, head, 'Jaw, cheeks and brow', base, skull, softness, sides)
  // Drape the lips and brows on the same cheek sections that form the head.
  function facialLine(name: string, color: string, points: readonly FaceLinePoint[]) {
    const line: Parameters<typeof sweptDetail>[4] = points.map(([x, y, width, relief]) => {
      const { center, width: radius, depth } = headSection(y)
      const z = center + depth * (1 - Math.abs(x / radius) ** (ellipsePower / softness)) ** (softness / ellipsePower)
      return [x, y, z, width, relief]
    })
    return sweptDetail(meshes, head, name, color, line, features.normal)
  }
  // Warm the cheeks and ear line gently across the sculpt. Vertex colors follow every selected skin tone.
  const positions = face.getVerticesData(VertexBuffer.PositionKind)!
  const tones: number[] = []
  const { cheek, baseTone, heightBlend, toneRiseHeight } = complexion
  for (let i = 0; i < positions.length; i += positionComponents) {
    const yIndex = i + 1
    const x = Math.abs(positions[i]), y = positions[yIndex], z = positions[yIndex + 1]
    const lateral = (x - cheek.center.x) / cheek.spread.x
    const vertical = (y - cheek.center.y) / cheek.spread.y
    const forward = (z - cheek.center.z) / cheek.spread.z
    const blush = Math.exp(-(lateral ** squaredDistance + vertical ** squaredDistance + forward ** squaredDistance))
    const shade = baseTone + heightBlend * Math.min(1, y / toneRiseHeight)
    tones.push(shade, shade * (1 - cheek.greenAttenuation * blush), shade * (1 - cheek.blueAttenuation * blush), 1)
  }
  face.setVerticesData(VertexBuffer.ColorKind, tones)
  skin.push(face)

  const nose = coastalProfile(meshes, head, 'Nose', base, noseShape.sections, noseShape.sides)
  nose.position.set(...noseShape.position)
  skin.push(nose)
  const eyes: { pivot: TransformNode, fill: TransformNode }[] = [], brows: Mesh[] = []
  const { position, heading, gazeOffsetX, white, iris, pupil, glint, upperLid } = eyeShape
  const { brow, mouth } = features
  for (const side of [-1, 1]) {
    skin.push(createCrewEar(meshes, head, side, base))
    const eye = new TransformNode('Blink at lash line', meshes.scene)
    eye.parent = head
    eye.position.set(side * position.x, position.y, position.z)
    eye.rotation.y = side * heading
    const fill = new TransformNode('Eye under the upper lid', meshes.scene)
    fill.parent = eye
    eyes.push({ pivot: eye, fill })
    meshes.sphere(...white.center, ...white.size, white.color, fill, false, white.segments)
    meshes.sphere(side * gazeOffsetX, iris.y, iris.z, ...iris.size, iris.color, fill, false, iris.segments)
    meshes.sphere(side * gazeOffsetX, pupil.y, pupil.z, ...pupil.size, pupil.color, fill, false, pupil.segments)
    meshes.sphere(...glint.center, ...glint.size, glint.color, fill, false, glint.segments)
    sweptDetail(meshes, eye, 'Upper lid', upperLid.color, upperLid.path, upperLid.normal)
    // A slight lift over one eye carries through the neutral expression.
    const lift = side === 1 ? brow.rightSideLift : 0
    brows.push(facialLine('Expressive brow', brow.color, brow.path.map(([x, y, width, relief]) => [side * x, y + lift, width, relief])))
  }
  const smile = facialLine('Soft smile', mouth.color, mouth.softSmile)
  const grin = facialLine('Wide smile', mouth.color, mouth.wideSmile)
  const hair = createCrewHair(meshes, head)

  const { crown, brim: brimShape, strap: strapShape, keeper: keeperShape } = crewCanvasCap
  const cap = garment(meshes, head, 'Seamed canvas cap', crown.color, crown.contour, crown.softness, crown.sides)
  const capTones: number[] = []
  const crownPositions = cap.getVerticesData(VertexBuffer.PositionKind)!
  const { seams, band } = crown
  for (let i = 0; i < crownPositions.length; i += positionComponents) {
    const yIndex = i + 1
    const x = crownPositions[i], y = crownPositions[yIndex], z = crownPositions[yIndex + 1]
    const meridian = Math.atan2(z + seams.meridianOffsetZ, x + seams.meridianOffsetX)
    const seam = Math.abs(Math.cos(seams.pairs * meridian)) ** seams.sharpness
    const tone = y <= band.top ? band.tone : 1 - seams.darkening * seam
    capTones.push(tone, tone, tone, 1)
  }
  cap.setVerticesData(VertexBuffer.ColorKind, capTones)
  // A shallow curve shades the eyes; the bound edge is visible in profile.
  const brim = meshes.sphere(...brimShape.center, ...brimShape.size, brimShape.color, head, true, brimShape.segments)
  brim.rotation.x = brimShape.tilt
  const strap = sweptDetail(meshes, cap, 'Rear cap strap', strapShape.color, strapShape.path, strapShape.normal)
  meshes.shadows.removeShadowCaster(strap, false)
  const keeper = garment(meshes, cap, 'Brass strap keeper', keeperShape.color, keeperShape.contour, keeperShape.softness, keeperShape.sides)
  meshes.shadows.removeShadowCaster(keeper, false)
  // At face scale the island shadow map aliases lashes and the smile onto the cheeks.
  // Keep direct shape lighting and cast the head's silhouette onto the scene.
  for (const part of head.getChildMeshes()) part.receiveShadows = false
  return { pivot: head, nose, eyes, brows, smile, grin, hair, cap, brim }
}
