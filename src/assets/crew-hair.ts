import { Color3 } from '@babylonjs/core/Maths/math.color'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { sweptDetail } from './crew-shapes'

const chestnut = '#50382f'

function createHairline(meshes: MeshFactory, root: TransformNode) {
  const vertices: number[] = [], faces: number[] = [], sides = 36
  for (const [row, [width, depth, y, dip]] of [
    [.285, .243, .375, .226], [.292, .256, .434, .162], [.29, .253, .49, .092],
    [.251, .218, .538, .033], [.177, .165, .563, .009], [.073, .072, .571, 0], [.002, .002, .572, 0],
  ].entries()) {
    for (let i = 0; i < sides; i++) {
      const a = i * 2 * Math.PI / sides, u = Math.cos(a), v = Math.sin(a)
      const line = (1 - v) / 2 + .16 * Math.abs(u) ** 8 + .052 * Math.sin(5 * a + .5)
      const part = .043 * Math.max(0, v) ** 4 * (1.0 + .64 * u) * (dip / .226)
      vertices.push(width * u, y - dip * line + part, depth * v - .003)
      if (row === 0) continue
      const b = (row - 1) * sides + i, c = (row - 1) * sides + (i + 1) % sides
      faces.push(b, c, b + sides, c, c + sides, b + sides)
    }
  }
  const scalp = meshes.surface('Tapered hairline', vertices, faces, chestnut, root)
  meshes.shadows.addShadowCaster(scalp, false)
  return scalp
}

type Lock = {
  name: string
  crest: [number, number, number]
  shade: number
  path: Parameters<typeof sweptDetail>[4]
}

// The tucked layers make up the nape and temples. Keep these visible with a cap.
const tuckedLocks: Lock[] = [
  {
    name: 'Left temple curl', crest: [1, .17, .36], shade: 1.00, path: [
      [.204, .397, .065, .023, .022], [.263, .379, .092, .057, .040],
      [.286, .311, .080, .055, .044], [.276, .258, .058, .030, .022], [.255, .239, .044, .007, .009],
    ],
  },
  {
    name: 'Right temple curl', crest: [-1, .12, .40], shade: 1.02, path: [
      [-.219, .400, .063, .019, .019], [-.272, .369, .080, .061, .044],
      [-.282, .303, .062, .057, .039], [-.269, .255, .053, .030, .023], [-.246, .246, .043, .008, .008],
    ],
  },
  {
    name: 'Left nape curl', crest: [.68, .06, -.73], shade: .93, path: [
      [.193, .446, -.137, .026, .022], [.217, .378, -.181, .068, .042],
      [.217, .282, -.177, .073, .041], [.173, .184, -.177, .048, .034], [.133, .165, -.162, .010, .010],
    ],
  },
  {
    name: 'Center nape curl', crest: [.04, -.07, -1], shade: .92, path: [
      [.080, .409, -.210, .024, .025], [.100, .323, -.238, .081, .045],
      [.059, .206, -.237, .073, .043], [.010, .130, -.222, .050, .037], [-.036, .109, -.194, .008, .009],
    ],
  },
  {
    name: 'Right nape curl', crest: [-.60, .08, -.8], shade: .95, path: [
      [-.145, .430, -.175, .022, .021], [-.173, .351, -.221, .079, .050],
      [-.165, .236, -.219, .082, .043], [-.126, .157, -.194, .052, .033], [-.081, .133, -.174, .009, .008],
    ],
  },
]

// The quiff rolls forward and over. The next locks follow the side part at
// staggered heights, with shorter upturned ends visible above the temples.
const liftedLocks: Lock[] = [
  {
    name: 'Rolled forelock', crest: [0, .56, .83], shade: 1.14, path: [
      [-.104, .496, -.047, .013, .009], [-.119, .551, .027, .059, .032],
      [-.101, .599, .104, .077, .045], [-.053, .605, .181, .082, .051],
      [.010, .554, .246, .068, .045], [.044, .485, .269, .051, .032],
      [.032, .422, .265, .033, .023], [.007, .407, .243, .007, .006],
    ],
  },
  {
    name: 'Crest behind the part', crest: [.12, .96, .23], shade: 1.03, path: [
      [-.104, .533, -.080, .020, .015], [-.050, .574, -.031, .062, .035],
      [.023, .589, .018, .063, .041], [.105, .575, .044, .054, .032],
      [.168, .595, .035, .032, .022], [.180, .624, .022, .006, .007],
    ],
  },
  {
    name: 'Sweep above the left brow', crest: [.15, .48, .86], shade: 1.07, path: [
      [-.033, .510, .081, .015, .012], [.037, .556, .156, .065, .039],
      [.118, .493, .231, .069, .046], [.201, .430, .220, .063, .040],
      [.275, .444, .173, .043, .028], [.298, .483, .132, .007, .009],
    ],
  },
  {
    name: 'Short left side wave', crest: [.74, .26, .61], shade: 1.00, path: [
      [.134, .485, .078, .017, .012], [.188, .441, .156, .068, .042],
      [.245, .371, .172, .068, .044], [.300, .365, .122, .046, .029],
      [.327, .397, .083, .008, .008],
    ],
  },
  {
    name: 'Right turn at the part', crest: [-.62, .35, .70], shade: 1.06, path: [
      [-.106, .505, .050, .018, .015], [-.177, .508, .098, .063, .039],
      [-.247, .463, .129, .073, .042], [-.284, .391, .113, .056, .037],
      [-.316, .356, .082, .036, .027], [-.337, .371, .063, .008, .009],
    ],
  },
  {
    name: 'Long crown sweep', crest: [-.32, .69, -.65], shade: 1.07, path: [
      [.035, .532, .075, .022, .015], [-.032, .565, .001, .077, .044],
      [-.118, .533, -.104, .083, .051], [-.197, .467, -.174, .074, .048],
      [-.255, .427, -.183, .047, .033], [-.288, .454, -.156, .008, .008],
    ],
  },
  {
    name: 'Lower sweep across the crown', crest: [-.16, .27, -.95], shade: 1.10, path: [
      [.064, .529, -.113, .020, .016], [.027, .498, -.207, .076, .043],
      [-.043, .415, -.257, .080, .053], [-.126, .353, -.261, .069, .049],
      [-.199, .356, -.236, .040, .031], [-.223, .396, -.206, .008, .009],
    ],
  },
  {
    name: 'Sweep over the left ear', crest: [.87, .47, -.13], shade: 1.06, path: [
      [.117, .512, .069, .016, .015], [.194, .505, .012, .066, .042],
      [.242, .458, -.084, .074, .049], [.262, .409, -.166, .065, .048],
      [.240, .408, -.242, .041, .031], [.197, .449, -.281, .008, .009],
    ],
  },
  {
    name: 'Short curl behind the left ear', crest: [.60, .27, -.76], shade: 1.04, path: [
      [.079, .519, -.115, .018, .017], [.153, .498, -.166, .065, .045],
      [.180, .431, -.221, .075, .048], [.231, .371, -.212, .065, .046],
      [.280, .377, -.176, .037, .027], [.306, .409, -.145, .008, .009],
    ],
  },
]

export function createCrewHair(meshes: MeshFactory, head: TransformNode) {
  const root = new TransformNode('Hair fitting', meshes.scene)
  root.parent = head
  const scalp = createHairline(meshes, root)
  const locks = [...tuckedLocks, ...liftedLocks].map(({ name, crest, shade, path }, i) => ({
    mesh: sweptDetail(meshes, root, name, chestnut, path, crest, 12),
    shade,
    underCap: i < tuckedLocks.length,
  }))
  return (hex: string, shaved: boolean, cap: boolean) => {
    root.setEnabled(!shaved)
    root.scaling.set(cap ? .94 : 1, cap ? .79 : 1, cap ? .92 : 1)
    root.position.y = cap ? .037 : 0
    const pigment = Color3.FromHexString(hex)
    scalp.material = meshes.paint(pigment.scale(.88).toHexString())
    for (const { mesh, shade, underCap } of locks) {
      mesh.material = meshes.paint(pigment.scale(shade).toHexString())
      mesh.setEnabled(underCap || !cap)
    }
  }
}
