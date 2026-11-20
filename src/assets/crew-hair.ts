import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { sweptDetail } from './crew-shapes'

export function createCrewHair(meshes: MeshFactory, head: TransformNode) {
  const root = new TransformNode('Hair fitting', meshes.scene)
  root.parent = head
  const color = '#50382f', vertices: number[] = [], faces: number[] = [], sides = 36
  for (const [row, [width, depth, y, dip]] of [
    [.285, .243, .375, .226], [.292, .256, .434, .162], [.29, .253, .49, .092],
    [.251, .218, .538, .033], [.177, .165, .563, .009], [.073, .072, .571, 0], [.002, .002, .572, 0],
  ].entries()) {
    for (let i = 0;i < sides;i++) {
      const a = i * 2 * Math.PI / sides, u = Math.cos(a), v = Math.sin(a)
      const line = (1 - v) / 2 + .16 * Math.abs(u) ** 8 + .052 * Math.sin(5 * a + .5)
      const part = .043 * Math.max(0, v) ** 4 * (1.0 + .64 * u) * (dip / .226)
      vertices.push(width * u, y - dip * line + part, depth * v - .003)
      if (row === 0) continue
      const b = (row - 1) * sides + i, c = (row - 1) * sides + (i + 1) % sides
      faces.push(b, c, b + sides, c, c + sides, b + sides)
    }
  }
  const scalp = meshes.surface('Tapered hairline', vertices, faces, color, root)
  meshes.shadows.addShadowCaster(scalp, false)
  const sidesAndBack: Mesh[] = []
  // Sweep the side and nape locks round the skull; each pointed tip lifts off the next mass.
  for (let i = 0;i < 7;i++) {
    const a = -.09 - i * (Math.PI - .18) / 6, c = Math.cos(a), s = Math.sin(a)
    const point = (angle: number, y: number, radius: number, w: number, d: number): [number, number, number, number, number] =>
      [Math.cos(angle) * radius, y, Math.sin(angle) * radius * .89, w, d]
    const low = .156 + .095 * Math.abs(c)
    sidesAndBack.push(sweptDetail(meshes, root, 'Wind-combed lock', color, [
      point(a + .39, .443, .237, .018, .018), point(a + .25, .377, .269, .062, .038),
      point(a + .04, low + .052, .279, .071, .046), point(a - .19, low - .022, .264, .044, .031), point(a - .34, low + .001, .249, .004, .005),
    ], [c, .15, s]))
  }
  const fringe = [
    sweptDetail(meshes, root, 'Lifted forelock', color, [
      [.092, .454, .112, .018, .014], [.087, .531, .142, .074, .045], [.023, .564, .169, .082, .058],
      [-.053, .533, .205, .076, .056], [-.102, .438, .244, .068, .049], [-.157, .365, .237, .058, .038], [-.214, .358, .197, .040, .027], [-.238, .387, .174, .004, .006],
    ], [0, .55, .84], 14),
    sweptDetail(meshes, root, 'Side part', color, [
      [.033, .493, .08, .012, .008], [.134, .51, .119, .067, .048], [.208, .456, .153, .072, .05],
      [.243, .381, .128, .064, .044], [.273, .333, .090, .047, .030], [.288, .330, .051, .024, .022], [.285, .351, .028, .004, .004],
    ], [.6, .13, .8], 14),
    sweptDetail(meshes, root, 'Parting curl', color, [
      [.115, .506, .112, .006, .008], [.073, .543, .177, .044, .030], [.016, .521, .223, .061, .043],
      [-.018, .461, .250, .057, .038], [-.009, .406, .253, .033, .027], [.013, .391, .245, .006, .007],
    ], [0, .28, .96], 12),
    sweptDetail(meshes, root, 'Lift at the crown', color, [
      [.034, .532, -.013, .009, .008], [-.06, .569, -.002, .050, .034], [-.128, .581, -.029, .057, .042],
      [-.165, .603, -.061, .031, .026], [-.158, .627, -.089, .004, .005],
    ], [-.2, .92, -.2], 12),
    sweptDetail(meshes, root, 'Crown wave', color, [
      [.112, .484, -.09, .012, .009], [.024, .541, -.077, .081, .041], [-.093, .539, -.064, .092, .055],
      [-.173, .483, -.099, .075, .047], [-.224, .449, -.127, .042, .031], [-.243, .46, -.134, .004, .004],
    ], [-.3, .93, -.2], 14),
  ]
  return (hex: string, shaved: boolean, cap: boolean) => {
    root.setEnabled(!shaved)
    root.scaling.set(cap ? .94 : 1, cap ? .79 : 1, cap ? .92 : 1)
    root.position.y = cap ? .037 : 0
    const pigment = Color3.FromHexString(hex)
    scalp.material = meshes.paint(pigment.scale(.88).toHexString())
    for (const [i, lock] of [...sidesAndBack, ...fringe].entries()) {
      lock.material = meshes.paint(pigment.scale([1.04, .97, 1.12][i % 3]).toHexString())
    }
    for (const mesh of fringe) mesh.setEnabled(!cap)
  }
}
