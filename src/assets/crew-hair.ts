import { Color3 } from '@babylonjs/core/Maths/math.color'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { CrewAppearance } from '../crew-appearance'
import { fittedHaircut, lowBun } from './crew-haircuts'
import { sweptDetail } from './crew-shapes'
import { crewHairlineGeometry, liftedHairLocks, tuckedHairLocks } from './geometry/crew-hair'

const chestnut = '#50382f'
const piPerTurn = 2
const half = 0.5
const scalpShade = 0.88

function createHairline(meshes: MeshFactory, root: TransformNode, cap = false) {
  const { cap: underCap, bareheaded, templePower, rearInset } = crewHairlineGeometry
  const { rings, sides } = cap ? underCap : bareheaded
  const { nape: napeWave } = underCap
  const { part, wave } = bareheaded
  const vertices: number[] = [], faces: number[] = []
  const curve = (n: number) => cap ? Math.sign(n) * Math.abs(n) ** underCap.curvePower : n
  for (const [row, [width, depth, y, dip]] of rings.entries()) {
    for (let i = 0; i < sides; i++) {
      const a = i * piPerTurn * Math.PI / sides, u = Math.cos(a), v = Math.sin(a)
      const side = Math.abs(u) ** templePower, back = (1 - v) * half
      // Taper behind the ears and break the lower nape with a shallow wave.
      const nape = Math.max(0, -v)
      const clipped = back + underCap.templeDrop * side
        + nape * (napeWave.amplitude * Math.cos(napeWave.frequency * a + napeWave.phase) + napeWave.lateralTilt * u)
      const line = cap ? clipped : back + bareheaded.templeDrop * side + wave.amplitude * Math.sin(wave.frequency * a + wave.phase)
      const lift = (cap ? 0 : part.lift) * Math.max(0, v) ** part.frontPower * (1 + part.lateralTilt * u) * (dip / part.referenceDrop)
      vertices.push(width * curve(u), y - dip * line + lift, depth * curve(v) - rearInset)
      if (row === 0) continue
      const b = (row - 1) * sides + i, c = (row - 1) * sides + (i + 1) % sides
      faces.push(b, c, b + sides, c, c + sides, b + sides)
    }
  }
  const scalp = meshes.surface(cap ? 'Cropped hair under cap' : 'Tapered hairline', vertices, faces, chestnut, root)
  meshes.shadows.addShadowCaster(scalp, false)
  return scalp
}

export function createCrewHair(meshes: MeshFactory, head: TransformNode) {
  const root = new TransformNode('Hair fitting', meshes.scene)
  root.parent = head
  const curls = new TransformNode('Swept curls', meshes.scene)
  curls.parent = root
  const scalp = createHairline(meshes, curls)
  const cropped = createHairline(meshes, root, true)
  const locks = [...tuckedHairLocks, ...liftedHairLocks].map(({ name, crest, shade, path }) => ({
    mesh: sweptDetail(meshes, curls, name, chestnut, path, crest, crewHairlineGeometry.lockSides),
    shade,
  }))
  const coils = fittedHaircut(meshes, root, 'coils', chestnut)
  const gathered = fittedHaircut(meshes, root, 'bun', chestnut)
  const bun = lowBun(meshes, root, chestnut)
  return (hex: string, style: NonNullable<CrewAppearance['hair']>, cap: boolean, openCrown = false) => {
    root.setEnabled(style !== 'bare')
    curls.setEnabled((!cap || openCrown) && style === 'short')
    for (const { mesh } of locks) mesh.setEnabled(!openCrown)
    coils.setEnabled((!cap || openCrown) && style === 'coils')
    gathered.setEnabled((!cap || openCrown) && style === 'bun')
    bun.setEnabled(style === 'bun')
    cropped.setEnabled(cap && !openCrown)
    const pigment = Color3.FromHexString(hex)
    scalp.material = cropped.material = meshes.paint(pigment.scale(scalpShade).toHexString())
    coils.material = gathered.material = bun.material = meshes.paint(hex)
    for (const { mesh, shade } of locks) mesh.material = meshes.paint(pigment.scale(shade).toHexString())
  }
}
