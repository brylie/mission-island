import { createRoad, createSidewalk, createTrail } from '../assets/routes'
import { surfaces } from '../materials'
import { footpaths, harborRoad, walkways } from '../routes'
import { control, range, type Entry } from './subject'

export const routeStudies: Entry[] = [
  {
    id: 'road', name: 'Island road', group: 'Routes', source: 'src/routes.ts', angle: 1.03,
    description: 'Inspect the full road ribbon, shoulders, and lane markings through both bends.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [
      range('width', 'Pavement width', 6, 3, 12, 0.2, true),
      { type: 'checkbox', key: 'shoulder', label: 'Show shoulder', value: true },
      { type: 'checkbox', key: 'markings', label: 'Show markings', value: true },
    ],
    create(meshes, values) {
      const route = createRoad(meshes, harborRoad, Number(values.width))
      return (_, options) => {
        route.shoulder.setEnabled(Boolean(options.shoulder))
        route.markings.setEnabled(Boolean(options.markings))
      }
    },
  },
  {
    id: 'trail', name: 'Footpaths', group: 'Routes', source: 'src/routes.ts',
    description: 'Compare the beach pavement, worn attraction paths, and gravel trails.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [
      control('route', 'Path', '0', Object.fromEntries(footpaths.map((path, i) => [i, path.name])), true),
      range('width', 'Width multiplier', 1, 0.5, 1.8, 0.05, true),
    ],
    create(meshes, values) {
      const path = footpaths[Number(values.route)]
      createTrail(meshes, path.name, path.points, path.width * Number(values.width), path.surface)
    },
  },
  {
    id: 'pavement', name: 'Neighborhood pavement', group: 'Routes', source: 'src/routes.ts',
    description: 'Inspect the paved walks and approaches around Seabrook houses.',
    ground: { height: 0, color: surfaces.grass.color },
    controls: [control('route', 'Walkway', '0', { 0: 'North neighborhood', 1: 'South neighborhood', 2: 'House entrance', 3: 'East houses' }, true)],
    create(meshes, values) {
      const path = walkways[Number(values.route)]
      createSidewalk(meshes, path)
    },
  },
]
